#!/usr/bin/python3
import jenkinsapi
import requests
from jenkinsapi.jenkins import Jenkins
import html2text

JENKINS_URL = "http://jenkins:8080"
LAST_X_BUILDS = 5


class Reporter(object):
    def __init__(self, timeout=20):
        self.server = Jenkins(JENKINS_URL, timeout=timeout)

    def get_jobs_list(self):
        return self.server.get_jobs_list()

    def get_stats(self):
        for job_name in self.get_jobs_list():
            print(job_name)
            job = self.server[job_name]
            build_ids_range = range(job.get_last_buildnumber() - LAST_X_BUILDS, job.get_last_buildnumber())
            for build_id in build_ids_range:
                # build_url = job.get_build_dict()[build_id]
                print("Build ID: %s" % build_id)
                try:
                    build = job.get_build(build_id)
                except requests.exceptions.ConnectionError as err:
                    if 'timeout' in str(err).lower():
                        print("Timeout")
                        continue
                try:
                    results_set = build.get_resultset()
                except jenkinsapi.custom_exceptions.NoResults:
                    print("No results")
                    continue
                pass_cnt = fail_cnt = 0
                for f_name, result in results_set.items():
                    print(f_name, result.status)
                    if result.status == "PASSED":
                        pass_cnt += 1
                    else:
                        fail_cnt += 1
                pass_ratio = 100 if fail_cnt == 0 else float(pass_cnt/fail_cnt) * 100
                print("Pass/Fail = %s/%s   Ratio = %s" % (pass_cnt, fail_cnt, pass_ratio))


if __name__ == "__main__":
    reporter = Reporter()
    reporter.get_stats()