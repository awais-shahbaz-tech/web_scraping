const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');


const startServer = (filePath) => {
    http.createServer((req, res) => {
      res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(filePath));
      res.setHeader('Content-type', 'text/csv');
      const filestream = fs.createReadStream(filePath);
      filestream.pipe(res);
    }).listen(5000, () => {
      console.log(`Server running at http://localhost:${5000}/`);
    });
  };

const convertToCSV = (data) => {
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  return `${header}\n${rows}`;
};

const scrapeFlightData = async (city) => {
    let browser;
    let page;
    const url = `https://www.flightradar24.com/airport/${city}/departures`;

    try {
    
        browser = await puppeteer.launch({
            headless: false,
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
        startServer(filePath);

        console.log('Data saved to flights.csv successfully');
        return allFlightData;

    } catch (error) {
        console.log("error", error);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

const main = async () => {
    await scrapeFlightData('lhe');
    // await scrapeFlightData('khi');
    // await scrapeFlightData('isb');
    // await scrapeFlightData('mux');
   
};

main();
