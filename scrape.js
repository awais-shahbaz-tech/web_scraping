const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser'); 

const app = express();
app.use(bodyParser.json()); 

const downloadFile = async (res, filePath) => {
    return new Promise((resolve, reject) => {
      const filestream = fs.createReadStream(filePath);
      filestream.on('open', () => {
        res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(filePath));
        res.setHeader('Content-type', 'text/csv');
        filestream.pipe(res);
      });
      filestream.on('end', () => {
        resolve();
      });
      filestream.on('error', (err) => {
        reject(err);
      });
    });
  };

// Function to convert data to CSV format
const convertToCSV = (data) => {
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  return `${header}\n${rows}`;
};

// Route to scrape flight data and download as CSV
app.get('/flights/:city', async (req, res) => {
  const city = req.params.city;

  let browser;
  let page;
  const url = `https://www.flightradar24.com/airport/${city}/departures`;

  try {
    browser = await puppeteer.launch({
      headless: true, // Change to true for production
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    });
    page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

    await page.waitForSelector('[data-testid="list-wrapper"]');

    const dropdownSvgs = await page.$$('.airport__flight-list-item');
    const allFlightData = [];

    for (const span of dropdownSvgs) {
      await span.click();
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

      const flights = await page.evaluate((span) => {
        const flight = {
          destination: span.querySelector('span.truncate.text-md.font-semibold.text-gray-1300')?.innerText.trim() || "",
          airline: span.querySelector('[data-testid="search__result-live__airline"]')?.innerText.trim() || "",
          flightDate: span.querySelector('div[data-testid="base-day-period-formatter"]')?.innerText.trim() || "",
          scheduledDeparture: span.querySelector('[data-testid="search__result-live__scheduled-departure"]')?.innerText.trim() || "",
          scheduledArrival: span.querySelector('[data-testid="search__result-live__scheduled-arrival"]')?.innerText.trim() || "",
          callSign: span.querySelector('[data-testid="search__result-live__callsign"]')?.innerText.trim() || "",
          equipment: (span.querySelector('span.truncate.text-sm.text-gray-900')?.innerText.trim().split('\n')[1]) || "",
          aircraft: span.querySelector('[data-testid="search__result-live__aircraft"]')?.innerText.trim() || "",
          flightNumber: (span.querySelector('span.truncate.text-sm.text-gray-900')?.innerText.trim().split(' ')[0]) || "",
        };
        return flight;
      }, span);

      allFlightData.push(flights);
    }

    const csvData = convertToCSV(allFlightData);

    const filePath = path.join(__dirname, `${city}.csv`);
    fs.writeFileSync(filePath, csvData);

    await downloadFile(res, filePath);

    console.log('Data saved to flights.csv successfully');
    return res.send(allFlightData);

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Error retrieving flight data");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
