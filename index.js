import 'dotenv/config';

import dropbox from 'dropbox';
import fetch from 'node-fetch';
import moment from 'moment';
import path from 'path';

const dbx = new dropbox.Dropbox({
  clientId: process.env.DROPBOX_APP_KEY,
  clientSecret: process.env.DROPBOX_APP_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
});

function getCrossword(date) {
  const d = moment(date);
  const crosswordURL = new URL(`https://www.nytimes.com/svc/crosswords/v2/puzzle/print/${d.format('MMMDDYY')}.pdf`);

  console.log(`Getting crossword for ${d.format('dddd (MM/DD/YYYY)')}`);
  console.log(`Crossword URL: ${crosswordURL}`);

  fetch(crosswordURL, {
    headers: {
      Referer: 'https://www.nytimes.com/crosswords/archive/daily',
      Cookie: process.env.NYT_COOKIE,
    },
  }).then((res) => {
    if (res.status === 200) {
      res.arrayBuffer().then((buffer) => {
        const normalizedUploadPath = path.normalize(process.env.DROPBOX_UPLOAD_PATH);
        const fileName = `${d.format('YYYYMMDD')} - NYT Crossword.pdf`
        const filePath = path.join(normalizedUploadPath, fileName);

        console.log(`Uploading crossword to ${filePath}`);

        dbx.filesUpload({
          path: filePath,
          contents: buffer,
        }).then((res) => {
          console.log('Successfully uploaded crossword');
          console.log(`Content hash: ${res.result.content_hash}`);
        }).catch((err) => {
          console.log('Error writing to Dropbox');
          console.log(err);
        });
      });
    } else {
      console.log('Response was unsuccessful');
      console.log(res.error);
    }
  }).catch(function (err) {
    console.log('Unable to fetch crossword');
    console.log(err);
  });
}

function run() {
  console.log('Running...');

  const today = new Date();
  const todayNY = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const tomorrowNY = new Date(todayNY).setDate(todayNY.getDate() + 1);

  console.log(`Time in New York: ${todayNY}`);

  const currentDay = todayNY.getDay();
  const currentHour = todayNY.getHours();

  const isWeekendCrossword = [0, 6].includes(currentDay);

  // Is it a weekday and between 10:00 and 10:59pm local NY time?
  const shouldFetchWeekdayCrossword = !isWeekendCrossword && currentHour === 22;

  // Is it the weekend and between 6:00 and 6:59pm local NY time?
  const shouldFetchWeekendCrossword = isWeekendCrossword && currentHour === 18;

  if (shouldFetchWeekdayCrossword || shouldFetchWeekendCrossword) {
    getCrossword(tomorrowNY);
  } else {
    console.log('Not ready to fetch crossword yet.');
  }
}

run();
