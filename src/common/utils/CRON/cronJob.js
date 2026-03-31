import { CronJob } from "cron";

export const checkNonConfirmedUsers = async (checkEmailValidity) => {
  const job = CronJob.from({
    cronTime: "0 0 * * * *",
    onTick: await checkEmailValidity(),
  });
  job.start();
  return;
};
