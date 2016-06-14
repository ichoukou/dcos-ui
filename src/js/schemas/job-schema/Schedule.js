/* eslint-disable no-unused-vars */
import React from 'react';
/* eslint-enable no-unused-vars */

const General = {
  title: 'Schedule',
  description: 'Set time and date for the job to run',
  type: 'object',
  properties: {
    id: {
      title: 'ID',
      description: 'The id for the job',
      type: 'string',
      getter: function (job) {
        let [schedule = {}] = job.getSchedules();

        return schedule.id;
      }
    },
    cron: {
      title: 'CRON Schedule',
      description: 'Enter your schedule in CRON formet e.g. [0 20 * * *]',
      type: 'string',
      getter: function (job) {
        let [schedule = {}] = job.getSchedules();

        return schedule.cron;
      }
    },
    timezone: {
      title: 'Time Zone',
      description: 'Enter time zone in TZ format e.g. [America/New_York]',
      type: 'string',
      getter: function (job) {
        let [schedule = {}] = job.getSchedules();

        return schedule.timezone;
      }
    },
    startingDeadlineSeconds: {
      title: 'Starting Deadline',
      description: 'Time in seconds for starting the job if it misses ' +
      'scheduled time for any reason. Missed jobs executions will be ' +
      'counted as failed ones.',
      type: 'number',
      getter: function (job) {
        let [schedule = {}] = job.getSchedules();

        return schedule.startingDeadlineSeconds;
      }
    }
  },
  required: ['id', 'cron']

};

module.exports = General;
