import * as constants from "./constants.js";

const provincesSelectElement = document.querySelector("#provinces");
const municipalitiesSelectElement = document.querySelector("#municipalties");
const gasStationListElement = document.querySelector("#gasStationList");
const productSelectElement = document.querySelector("#products");
const openGasStationsCheckbox = document.querySelector("#openGasStations"); 
const messageContainerElement = document.querySelector("#messageContainer"); 

let selectedMunicipalityID = null; 
let gasStationsByMunicipality = []; // To store the gas stations of the selected municipality

// Function to connect to the API
async function request(url) {
    try {
        let response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Request error:", error.message);
        return null;
    }
}

// Function to load provinces
async function loadProvinces() {
    let provinces = await request(constants.Province);
    if (!provinces) return;

    provinces.forEach((province) => {
        let option = document.createElement("option");
        option.value = province.IDPovincia;
        option.textContent = province.Provincia;
        provincesSelectElement.appendChild(option);
    });
}

// Function to load municipalities of a province
async function loadMunicipalities(provinceID) {
    municipalitiesSelectElement.innerHTML = `<option selected disabled>-- Select a municipality --</option>`;
    let url = `${constants.MunicipalityByProvince}${provinceID}`;
    let municipalities = await request(url);

    municipalities.forEach((municipality) => {
        let option = document.createElement("option");
        option.value = municipality.IDMunicipio;
        option.textContent = municipality.Municipio;
        municipalitiesSelectElement.appendChild(option);
    });
}

// Function to load products
async function loadProducts() {
    let url = `${constants.Products}`;
    let products = await request(url);

    products.forEach((product) => {
        let option = document.createElement("option");
        option.value = product.NombreProducto; 
        option.textContent = product.NombreProducto;
        productSelectElement.appendChild(option);
    });
}

// Function to load gas stations of a municipality
async function loadGasStations(municipalityID) {
    let url = `${constants.GasStationsByMunicipality}${municipalityID}`;
    let response = await request(url);

    gasStationsByMunicipality = response.ListaEESSPrecio || []; // Here we store the gas stations
    if (gasStationsByMunicipality.length === 0) {
        // Display message if no gas stations are available
        messageContainerElement.textContent = "No gas stations are available in this municipality.";
        gasStationListElement.innerHTML = ""; // Clear the card container
        return;
    }

    filterStations(); // Call the filter to reflect the checkbox state
}

// Function to filter gas stations by product
function filterGasStationsByProduct(productName) {
    let filteredStations = gasStationsByMunicipality.filter((station) => {
        let priceKey = `Precio ${productName}`;
        return station[priceKey] && station[priceKey] !== "";
    });

    messageContainerElement.innerHTML = ""; // Clear previous messages

    if (filteredStations.length === 0) {
        // Display message if the product is not available
        messageContainerElement.textContent = `The selected product is not available in this municipality.`;
        gasStationListElement.innerHTML = ""; // Clear the card container
        return;
    }

    updateGasStationCards(filteredStations);
}

// Function to update gas station cards
function updateGasStationCards(gasStations) {
    gasStationListElement.innerHTML = ""; // Clear the container
    messageContainerElement.innerHTML = ""; // Clear previous messages

    if (gasStations.length === 0) {
        // Display message if no gas stations are available
        messageContainerElement.textContent = "No gas stations are available in this municipality.";
        return;
    }

    gasStations.forEach((gasStation) => {
        let card = document.createElement("div");
        card.className = "card";

        // Header (gas station name)
        let header = document.createElement("div");
        header.className = "card-header";
        header.textContent = gasStation.Rótulo;

        // Content (gas station details)
        let content = document.createElement("div");
        content.className = "card-content";

        let address = document.createElement("div");
        address.className = "card-item";
        address.innerHTML = `<span>Address:</span> ${gasStation.Dirección}`;

        let town = document.createElement("div");
        town.className = "card-item";
        town.innerHTML = `<span>Town:</span> ${gasStation.Localidad}`;

        let province = document.createElement("div");
        province.className = "card-item";
        province.innerHTML = `<span>Province:</span> ${gasStation.Provincia}`;

        let schedule = document.createElement("div");
        schedule.className = "card-item";
        schedule.innerHTML = `<span>Schedule:</span> ${gasStation.Horario}`;

        // Append elements to content and card
        content.appendChild(address);
        content.appendChild(town);
        content.appendChild(province);
        content.appendChild(schedule);

        card.appendChild(header);
        card.appendChild(content);

        // Append the card to the container
        gasStationListElement.appendChild(card);
    });
}

// Function to filter open gas stations
function filterStations() {
    let filteredStations = gasStationsByMunicipality;

    if (openGasStationsCheckbox.checked) {
        filteredStations = filteredStations.filter((station) =>
            isStationInService(station.Horario)
        );
    }

    updateGasStationCards(filteredStations);
}

// Check if the station is open now
function isStationInService(schedule) {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (schedule.includes("L-D: 24H")) return true;

    const daysMap = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
    const hours = schedule.split(";");

    for (const hour of hours) {
        const [days, timeRange] = hour.split(": ");
        const [startDay, endDay] = days.split("-").map((d) => daysMap[d.trim()]);
        const [start, end] = timeRange
            .split("-")
            .map((t) => t.split(":").reduce((h, m) => h * 60 + Number(m)));

        if (
            ((currentDay >= startDay && currentDay <= endDay) ||
                (endDay < startDay &&
                    (currentDay >= startDay || currentDay <= endDay))) &&
            ((currentTime >= start && currentTime <= end) ||
                (end < start && (currentTime >= start || currentTime <= end)))
        ) {
            return true;
        }
    }
    return false;
}

// Event for selecting province
provincesSelectElement.addEventListener("change", (event) => {
    let selectedProvinceID = event.target.value;
    loadMunicipalities(selectedProvinceID);
});

// Event for selecting municipality
municipalitiesSelectElement.addEventListener("change", (event) => {
    selectedMunicipalityID = event.target.value;
    loadGasStations(selectedMunicipalityID);
});

// Event for selecting product
productSelectElement.addEventListener("change", (event) => {
    let selectedProduct = event.target.value;
    filterGasStationsByProduct(selectedProduct);
});

// Event for the open gas stations checkbox
openGasStationsCheckbox.addEventListener("change", () => {
    filterStations();
});

// Load initial data
loadProvinces();
loadProducts();
