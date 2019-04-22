import json

import jenkinsapi
import requests
from jenkinsapi.jenkins import Jenkins

TIMEOUT = 20
JENKINS_URL = "http://jenkins:8080"
JSON_API_SUFFIX = "api/json"


class CIJenkinsAPI(object):
    def __init__(self, job_names, last_x_builds):
        self.jobs_names = job_names
        self.last_x_builds = last_x_builds
        self.jenkins = Jenkins(JENKINS_URL, timeout=TIMEOUT)
        self.jobs = self.__get_jobs()

    def get_jobs(self):
        return self.jobs

    def __get_jobs(self):
        jobs = []
        for job_name in self.jobs_names:
            jobs.append(Job(job_name, self.get_job_by_name(job_name), self.last_x_builds))
        return jobs

    def get_job_names(self):
        return self.jobs_names

    def get_all_jobs(self):
        return self.jenkins.get_jobs_list()

    def get_job_by_name(self, name):
        job = None
        try:
            job = self.jenkins.jobs[name]
        except requests.exceptions.ConnectionError:
            print("Error: couldn't get job %s info. Ignoring..." % name)
        return job


class Job(object):
    def __init__(self, name, jenkins_job, last_x_builds):
        print("====== %s ======" % name)
        self.name = name
        self._job = jenkins_job
        self.builds = self.__get_builds(last_x_builds)

    def get_name(self):
        return self.name

    def get_builds(self):
        return self.builds

    def __get_builds(self, last_x_builds):
        builds = []
        build_ids = self.get_last_x_build_ids(last_x_builds + 1)
        skipped = False
        for build_id in reversed(build_ids):
            # skip running builds
            if not skipped:
                current_build_url = JENKINS_URL + "/job/%s/%d/%s" % (self.name, build_id, JSON_API_SUFFIX)
                try:
                    current_build_data = json.loads(requests.get(current_build_url, timeout=2).text)
                except Exception:
                    skipped = True
                    print("skipping build %d - %s" % (build_id, current_build_url))
                    continue
                if current_build_data['building']:
                    skipped = True
                    continue
            builds.append(Build(self.name, build_id))
        return builds

    def get_last_x_build_ids(self, last_x_builds):
        build_ids_range = []
        try:
            build_ids_range = range(self._job.get_last_buildnumber() - last_x_builds + 1,
                                    self._job.get_last_buildnumber() + 1)
        except jenkinsapi.custom_exceptions.NoBuildData:
            print("Error: no build data for job %s", str(self._job))
        return build_ids_range


class Build(object):
    def __init__(self, job_name, build_id):
        print(build_id)
        self.build_id = build_id
        self.job_name = job_name
        self.url = None
        self.test_report = {}
        self.has_tests = False
        self.general_url = JENKINS_URL + "/job/%s/%d/%s" % (self.job_name, self.build_id, JSON_API_SUFFIX)
        self.test_report_url = JENKINS_URL + "/job/%s/%d/testReport/%s" % (self.job_name, self.build_id, JSON_API_SUFFIX)
        self.test_log_prefix = JENKINS_URL + "/job/%s/%d/artifact/test_logs/" % (self.job_name, self.build_id)
        if self.is_accessible():
            self.test_report = self.__get_test_report()
            self.artifacts = self.__get_artifacts()
            self.tests = [Test(case_data) for case_data in self.test_report['suites'][0]['cases']] \
                if self.test_report.get('suites') else []

    def is_accessible(self):
        for url in [self.test_report_url, self.general_url]:
            if self._is_url_accessible(url):
                if "testReport" in url:
                    self.has_tests = True
                self.url = url
                return True
        return False

    @staticmethod
    def _is_url_accessible(url):
        try:
            response = requests.get(url, timeout=1)
        except requests.ConnectionError:
            return False
        if response.status_code == 404:
            return False
        return response.ok

    def __get_test_report(self):
        return json.loads(requests.get(self.test_report_url).text)

    def __get_artifacts(self):
        if self._is_url_accessible(self.general_url):
            return json.loads(requests.get(self.general_url).text).get("artifacts", [])
        return []

    def get_id(self):
        return self.build_id

    def get_run_time_in_seconds(self):
        return self.test_report['suites'][0]['duration']

    def get_tests(self):
        return self.tests

    def get_num_of_failed_tests(self):
        return self.test_report.get('failCount', 0)

    def get_num_of_passed_tests(self):
        return self.test_report.get('passCount', 0)

    def get_num_of_skipped_tests(self):
        return self.test_report.get('skipCount', 0)

    def get_total_num_of_running_tests(self):
        return self.get_num_of_failed_tests() + self.get_num_of_passed_tests() + self.get_num_of_skipped_tests()

    def get_pass_ratio(self):
        return 100 if self.get_num_of_failed_tests() == 0 else \
            float(self.get_num_of_passed_tests() / self.get_total_num_of_running_tests()) * 100

    def get_passed_out_of_total(self):
        return "%d/%d" % (self.get_num_of_passed_tests(), self.get_total_num_of_running_tests())

    def get_result(self):
        if not self.is_accessible():
            return "Not accessible"
        if self.has_tests:
            if self.get_num_of_passed_tests() + self.get_num_of_failed_tests() == 0:
                return "SKIPPED"
            if self.get_pass_ratio() == 100:
                return "PASSED"
            if self.get_num_of_failed_tests() > 0:
                return "FAILED"
        return "PASSED" if self.test_report.get("result", "N/A") else "N/A"

    def __get_failed_test_names_list(self):
        return [case['name'].split(".py")[0] for case in self.test_report['suites'][0]['cases']
                if case['status'] in ["FAILED", "REGRESSION"]]

    def get_failed_test_names(self):
        if self.has_tests:
            return "\n".join(self.__get_failed_test_names_list())
        return ""

    def get_test_log_urls(self):
        return [self.test_log_prefix + a['relativePath'] for a in self.artifacts if a['fileName'] == "test.log"]

    def get_failed_test_log_url_by_test_name(self, test_name):
        for test_log_url in self.get_test_log_urls():
            if test_name in test_log_url:
                return self.test_log_prefix + test_log_url
            
    def get_all_failed_test_urls(self):
        return ""
        "\n".join([self.get_failed_test_log_url_by_test_name(t) for t in self.__get_failed_test_names_list()])


class Test(object):
    def __init__(self, data):
        self.data = data

    def get_name(self):
        return self.data['name']

    def get_run_time_in_seconds(self):
        return self.data['duration']

    def get_result(self):
        return self.data['status']

    def get_error_details(self):
        return self.data.get('errorDetails', "")

    def get_stack_trace(self):
        return self.data.get('errorStackTrace', "")


