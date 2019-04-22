#!/usr/bin/python3
from pprint import pprint, pformat
from prettytable import PrettyTable
import api

JOBS = ["Duros_Build"]

# JOBS = ["Dell_PhysicalTests_master", "EPYC_PhysicalTests_master_S", "EPYC_PhysicalTests_weekly", "EPYC_QCT_Physical_S",
#         "FPGA_UT", "network_lab_ci", "release_job", "System_perf_and_pers", "System_weekly", "SystemTests_Physical_S",
#         "Systest_Benchmarks", "upgrader_job", "devops_production_S", "Duros_Build", "EPYC_VirtualTests_master_S",
#         "KernelightTests_duros_S", "KernelightTests_master_S", "LightOS_basic_virtual_master", "lwip_master_s",
#         "mgmt_dev_validation_testing", "RootFSBuild_S", "SystemTests_S", "SystemTestsDev_S", "testOSterone_S",
#         "UserLightTests_master_S"]
LAST_X_BUILDS = 3
LOG_DELIMITER = 'http://'
ERROR_STATUS_LIST = ["FAILED", "REGRESSION"]
COLUMNS = ["Job", "Build IDs", "Status", "Pass/Total", "Failed tests", "Ratio", "Test log files"]
TEST_FILENAME_DELIMITER = "test_logs/"


class Reporter(object):
    def __init__(self, timeout=20):
        # self.server = Jenkins(JENKINS_URL, timeout=timeout)
        self.api = api.CIJenkinsAPI(JOBS, LAST_X_BUILDS)
        self.t = PrettyTable(hrules=1)
        self.t.field_names = COLUMNS

    # @classmethod
    # def __get_log_urls_from_result(cls, result):
    #     urls = {}
    #     for line in result.errorStackTrace.split('\n'):
    #         if LOG_DELIMITER in line:
    #             index = line.index(LOG_DELIMITER)
    #             urls[line[:index].strip().lower().split(':')[0]] = line[index:]
    #     if len(urls) == 0:
    #         return urls
    #     pprint(urls)
    #     # cls.__parse_log_by_url(urls['log'])
    #     return urls
    #
    # @classmethod
    # def __parse_log_by_url(cls, url):
    #     response = requests.get(url)
    #     if response.status_code != 200:
    #         print("[Error %d] Couldn't parse %s" % (response.status_code, url))
    #         return
    #     print(response.text)

    def get_stats(self):
        for job in self.api.get_jobs():
            print("\n%s" % job.get_name())
            for build in job.get_builds():
                print("Build ID: %s" % build.get_id())
                if build.is_accessible():
                    row = [job.get_name(),
                           build.get_id(),
                           build.get_result(),
                           build.get_passed_out_of_total(),
                           build.get_failed_test_names(),
                           "%.2f" % build.get_pass_ratio(),
                           build.get_all_failed_test_urls()]
                else:
                    row = [job.get_name(),
                           build.get_id(),
                           build.get_result(),
                           "",
                           "",
                           "",
                           ""]
                self.t.add_row(row)
        print(self.t)


if __name__ == "__main__":
    reporter = Reporter()
    reporter.get_stats()
