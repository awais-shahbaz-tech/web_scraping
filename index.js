const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser'); 
const app = express();
app.use(bodyParser.json()); 
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
    
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Function to convert data to CSV format
const convertToCSV = (data) => {
    if (!data.length) return '';
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return `${header}\n${rows}`;
};

app.get('/', (req, res) => {
    res.status(200).send('Hello from the server');
});

app.get('/flights/:city', (req, res) => {
  res.render('index');
});

// Route to scrape flight data and download as CSV
app.get('/scrape/:city', async (req, res) => {
    const city = req.params.city;

    let browser;
    const url = `https://www.flightradar24.com/airport/${city}/departures`;

    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: false });

        const page = await browser.newPage();

        console.log('Setting user agent...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { timeout: 60000 });
        await page.setViewport({ width: 1080, height: 1024 });
        // Handle cookies consent popup
        try {
            await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 6000 });
            console.log('Cookies consent popup found. Accepting cookies...');
            await page.click('#onetrust-accept-btn-handler');
            await page.waitForTimeout(5000); // Wait for a few seconds to ensure popup is handled
        } catch (e) {
            console.log('No cookies consent popup found.');
        }

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

        const filePath = path.join(__dirname, 'public', `${city}.csv`);

        fs.writeFileSync(filePath, csvData);
        
       
        res.json(allFlightData);
       
        console.log('Data saved to flights.csv successfully');
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
                                                
