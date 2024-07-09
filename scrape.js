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

const convertToCSV = (data) => {
    if (!data.length) return '';
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return `${header}\n${rows}`;
};

const retry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt < retries) {
                console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
    }
};

const scrapeFlightData = async (url) => {
    let browser;
    let page;
    try {
        browser = await retry(() => puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
            ],
            timeout: 6000000
        }));

        page = await retry(() => browser.newPage());
        await retry(() => page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'));
        await retry(() => page.goto(url, { waitUntil: 'networkidle2', timeout: 0 }));

  

        await retry(() => page.waitForSelector('[data-testid="list-wrapper"]'));

        const dropdownSvgs = await page.$$('.airport__flight-list-item');
        const allFlightData = [];

        for (const span of dropdownSvgs) {
            await retry(() => span.click());
            await page.waitForTimeout(1000);

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

        return allFlightData;

    } catch (error) {
        console.error("Error:", error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

app.get('/flights/:city', async (req, res) => {
    const city = req.params.city;
    const url = `https://www.flightradar24.com/airport/${city}/departures`;

    try {
        const allFlightData = await scrapeFlightData(url);
        const csvData = convertToCSV(allFlightData);

        const filePath = path.join(__dirname, `${city}.csv`);
        fs.writeFileSync(filePath, csvData);

        await downloadFile(res, filePath);

        console.log('Data saved to flights.csv successfully');
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send("Error retrieving flight data");
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
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

const convertToCSV = (data) => {
    if (!data.length) return '';
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return `${header}\n${rows}`;
};

const retry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt < retries) {
                console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
    }
};

const scrapeFlightData = async (url) => {
    let browser;
    let page;
    try {
        browser = await retry(() => puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
            ],
            timeout: 6000000
        }));

        page = await retry(() => browser.newPage());
        await retry(() => page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'));
        await retry(() => page.goto(url, { waitUntil: 'networkidle2', timeout: 0 }));

        try {
            await retry(() => page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 }));
            await retry(() => page.click('#onetrust-accept-btn-handler'));
            await page.waitForTimeout(5000);
        } catch (e) {
            console.log('No cookies consent popup found.');
        }

        await retry(() => page.waitForSelector('[data-testid="list-wrapper"]'));

        const dropdownSvgs = await page.$$('.airport__flight-list-item');
        const allFlightData = [];

        for (const span of dropdownSvgs) {
            await retry(() => span.click());
            await page.waitForTimeout(1000);

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

        return allFlightData;

    } catch (error) {
        console.error("Error:", error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

app.get('/flights/:city', async (req, res) => {
    const city = req.params.city;
    const url = `https://www.flightradar24.com/airport/${city}/departures`;

    try {
        const allFlightData = await scrapeFlightData(url);
        const csvData = convertToCSV(allFlightData);

        const filePath = path.join(__dirname, `${city}.csv`);
        fs.writeFileSync(filePath, csvData);

        await downloadFile(res, filePath);

        console.log('Data saved to flights.csv successfully');
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send("Error retrieving flight data");
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
