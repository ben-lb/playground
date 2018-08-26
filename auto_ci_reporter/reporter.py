#!/usr/bin/python3
import jenkinsapi
import requests
from jenkinsapi.jenkins import Jenkins
from pprint import pprint

JENKINS_URL = "http://jenkins:8080"
LAST_X_BUILDS = 3
LOG_DELIMITER = 'http://'


class Reporter(object):
    def __init__(self, timeout=5):
        self.server = Jenkins(JENKINS_URL, timeout=timeout)
        # self.jobs = self.__get_jobs()
        self.jobs = ['SystemTests_Physical_S']

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
        for job_name in self.jobs:
            print("\n%s" % job_name)
            try:
                job = self.server[job_name]
            except requests.exceptions.ConnectionError:
                print("Error: couldn't get job %s info. Skipping..." % job)
                continue
            try:
                build_ids_range = range(job.get_last_buildnumber() - LAST_X_BUILDS, job.get_last_buildnumber())
            except jenkinsapi.custom_exceptions.NoBuildData:
                continue
            for build_id in build_ids_range:
                # build_url = job.get_build_dict()[build_id]
                print("Build ID: %s" % build_id)
                build = None
                try:
                    build = job.get_build(build_id)
                except requests.exceptions.ConnectionError as err:
                    if 'timeout' in str(err).lower():
                        print("Timeout")
                        continue
                except jenkinsapi.custom_exceptions.NotFound:
                    continue
                try:
                    results_set = build.get_resultset()
                except jenkinsapi.custom_exceptions.NoResults:
                    print("No results")
                    continue
                pass_cnt = fail_cnt = 0
                total_cnt = len(results_set.items())
                if total_cnt == 0:
                    continue
                for f_name, result in results_set.items():
                    print(f_name, result.status)
                    if result.status == "PASSED":
                        pass_cnt += 1
                    else:
                        fail_cnt += 1
                        if result.status == "FAILED":
                            self.__get_log_urls_from_result(result)
                pass_ratio = 100 if fail_cnt == 0 else float(pass_cnt/total_cnt) * 100
                print("Pass/Total = %s/%s   Ratio = %.2f" % (pass_cnt, total_cnt, pass_ratio))


if __name__ == "__main__":
    reporter = Reporter()
    reporter.get_stats()