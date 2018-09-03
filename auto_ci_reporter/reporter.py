#!/usr/bin/python3
import jenkinsapi
import requests
from jenkinsapi.jenkins import Jenkins
from pprint import pprint, pformat
from prettytable import PrettyTable

JENKINS_URL = "http://jenkins:8080"
JOBS = ["System_weekly", "network_lab_ci", "System_perf_and_pers", "SystemTests_Physical_S", "devops_production_S",
        "KernelightTests_master_S", "lwip_master_s", "RootFSBuild_S", "SystemTests_S", "SystemTestsDev_S",
        "testOSterone_S", "UserLightTests_master_S"]
LAST_X_BUILDS = 3
LOG_DELIMITER = 'http://'
ERROR_STATUS_LIST = ["FAILED", "REGRESSION"]
COLUMNS = ["Job", "Build IDs", "Status", "Pass/Total", "Ratio", "Test log files"]


class Reporter(object):
    def __init__(self, timeout=5):
        self.server = Jenkins(JENKINS_URL, timeout=timeout)
        self.jobs = self.__get_jobs()
        self.t = PrettyTable(hrules=1)
        self.t.field_names = COLUMNS
        # self.jobs = ['SystemTests_Physical_S']
        # self.jobs = ['common_pr_validation']
        # self.jobs = ['Upstream_tests']
        # self.jobs = ['kernelight_aws']

    def __get_jobs(self):
        print("Getting jobs state")
        return [job for job in self.server.get_jobs_list()]

    @classmethod
    def __get_log_urls_from_result(cls, result):
        urls = {}
        for line in result.errorStackTrace.split('\n'):
            if LOG_DELIMITER in line:
                index = line.index(LOG_DELIMITER)
                urls[line[:index].strip().lower().split(':')[0]] = line[index:]
        if len(urls) == 0:
            return urls
        pprint(urls)
        cls.__parse_log_by_url(urls['log'])
        return urls

    @classmethod
    def __parse_log_by_url(cls, url):
        response = requests.get(url)
        if response.status_code != 200:
            print("[Error %d] Couldn't parse %s" % (response.status_code, url))
            return
        print(response.text)

    def get_stats(self):
        for job_name in JOBS:
            print("\n%s" % job_name)
            try:
                job = self.server[job_name]
            except requests.exceptions.ConnectionError:
                print("Error: couldn't get job %s info. Skipping..." % job_name)
                continue
            try:
                build_ids_range = range(job.get_last_buildnumber() - LAST_X_BUILDS + 1, job.get_last_buildnumber() + 1)
            except jenkinsapi.custom_exceptions.NoBuildData:
                continue
            for build_id in reversed(build_ids_range):
                row = [job_name, build_id]
                print("Build ID: %s" % build_id)
                build = None
                try:
                    build = job.get_build(build_id)
                except requests.exceptions.ConnectionError as err:
                    if 'timeout' in str(err).lower():
                        row += ["Timeout", "", "", ""]
                        print("Timeout")
                        self.t.add_row(row)
                        continue
                except jenkinsapi.custom_exceptions.NotFound:
                    row += ["Not Found", "", "", ""]
                    print("Not Found")
                    self.t.add_row(row)
                    continue
                try:
                    results_set = build.get_resultset()
                except jenkinsapi.custom_exceptions.NoResults:
                    row += ["No Result", "", "", ""]
                    self.t.add_row(row)
                    print("No results")
                    continue
                pass_cnt = fail_cnt = 0
                total_cnt = len(results_set.items())
                if total_cnt == 0:
                    continue
                urls = ""
                for f_name, result in results_set.items():
                    print(f_name, result.status)
                    if result.status == "PASSED":
                        pass_cnt += 1
                    else:
                        fail_cnt += 1
                        if result.status in ERROR_STATUS_LIST:
                            urls = self.__get_log_urls_from_result(result)
                pass_ratio = 100 if fail_cnt == 0 else float(pass_cnt/total_cnt) * 100
                row += ["PASSED" if int(pass_ratio) == 100 else "FAILED",
                        "%s/%s" % (pass_cnt, total_cnt),
                        "%.2f" % pass_ratio,
                        pformat(urls) if urls else ""]
                print("Pass/Total = %s/%s   Ratio = %.2f" % (pass_cnt, total_cnt, pass_ratio))
                self.t.add_row(row)
        print(self.t)


if __name__ == "__main__":
    reporter = Reporter()
    reporter.get_stats()
