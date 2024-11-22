import React, { useState, useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import earthDiffuse from "../../src/assets/earth_day.jpg"
import earthDiffuse2 from "../../src/assets/earth_day_2.jpg"
import earthNightDiffuse from "../../src/assets/earth_night.jpg"
import earthNightDiffuse2 from "../../src/assets/earth_night_2.jpg"
import earthBump from "../../src/assets/earth_bump.jpg"
import { csvParse, scaleSequentialSqrt, interpolateYlOrRd } from 'd3';
import countryCodeCSV from "../../src/assets/countries.csv"
import carbonEmissionCSV from "../../src/assets/carbon_emission.csv"
import populationCSV from "../../src/assets/population_data.csv"
import country_geoJson from "../ne_110m_admin_0_countries.geojson?url";
import parseCSVData from "../helper_functions/functions"
import HomePage from './HomePage';

const Globe3D = () => {
    const [countryCodeData, setCountryCodeData] = useState(new Map());
    const [countryBounds, setCountryBounds] = useState({ features: [] });
    const [visData, setVisData] = useState([]);
    const [minMaxData, setMinMaxData] = useState({ min: 0, max: 1 });
    const [globeAttributes, setglobeAttributes] = useState({});
    const [visualization, setVisualization] = useState('none'); // 'hex' or 'heatmap' or 'borders'
    const [visualizationData, setVisualizationData] = useState('none'); // 'carbon_emissionn' or 'world_population' or 'none'
    const [isVisModeDropDownOpen, setIsVisModeDropDownOpen] = useState(false); // 'hex' or 'heatmap' or 'borders'
    const [isVisDataDropDownOpen, setIsVisDataDropDownOpen] = useState(false); // 'hex' or 'heatmap' or 'borders'
    const [isCountryNameVisible, setIsCountryNameVisible] = useState(false)
    const [earthTexture, setEarthTexture] = useState(earthDiffuse2)
    const [isEarthDay, setIsEarthDay] = useState(true)
    const [polygonHoverACtive, setPolygonHoverActive] = useState();
    const [isHomePageVisible, setIsHomePageVisible] = useState(true);
    const [isDataTableVisble, setIsDataTableVisble] = useState(false);
    const [fadeHomePage, setFadeHomePage] = useState(true);
    const [fadeNotification, setFadeNotification] = useState(false);
    const globeEl = useRef();

    const handleIsVisModeDropDownOpen = () => {
        setIsVisDataDropDownOpen(false);
        setIsVisModeDropDownOpen(!isVisModeDropDownOpen);
    };

    const handleIsVisDataDropDownOpen = () => {
        setIsVisModeDropDownOpen(false);
        setIsVisDataDropDownOpen(!isVisDataDropDownOpen);
    };

    const weightColor = scaleSequentialSqrt(interpolateYlOrRd)
        .domain([0, 1e7]);

    const normalizeVisualizationData = (data, newMin, newMax) => {
        const emissions = data.map(d => d.data);
        const min = Math.min(...emissions);
        const max = Math.max(...emissions);

        if (min === max) {
            return data.map(d => ({ ...d, unNormalizedData: parseFloat(d.data), data: newMin, }));
        }

        const normalizedData = data.map(d => ({
            ...d,
            unNormalizedData: parseFloat(d.data),
            data: ((d.data - min) / (max - min)) * (newMax - newMin) + newMin
        }));
        return normalizedData;
    }

    const handleToggleVisualization = (e) => {
        handleIsVisModeDropDownOpen()
        setVisualization(e.target.id);
    };

    const handleToggleData = (e) => {
        setIsVisDataDropDownOpen(false);
        setIsVisModeDropDownOpen(false);
        switch (e.target.id) {
            case "carbon_emission":
                loadCarbonEmissionData().then(d => {
                    setVisualizationData("carbon_emission");
                    console.log(e.target.id, "is the data being rendered", visData)
                });
                break;
            case "world_population":
                loadPopulationData().then(d => {
                    setVisualizationData("world_population");
                    console.log(e.target.id, "is the data being rendered", visData)
                })
                break;
            default:
                setFadeNotification(true)
                setTimeout(() => {
                    setFadeNotification(false)
                }, 1400)
        }
        setVisualizationData(e.target.id);
    };

    const handleCountryNameVisibility = (e) => {
        setIsCountryNameVisible(!isCountryNameVisible);
    };

    const handleEarthTexture = (e) => {
        if (isEarthDay) {
            setEarthTexture(earthNightDiffuse);
            setIsEarthDay(false)
        }
        else {
            setEarthTexture(earthDiffuse2);
            setIsEarthDay(true)
        }
    };

    const generateRGB = (value, minValue, maxValue) => {
        const clampedValue = Math.max(minValue, Math.min(maxValue, value));
        const normalizedValue = (clampedValue - minValue) / (maxValue - minValue);
        const red = Math.floor(255 * normalizedValue);
        const green = 0; // Adjust this to get different color ranges
        const blue = Math.floor(255 * (1 - normalizedValue));
        return `rgba(${red}, ${green}, ${blue}, 0.7)`;
    }

    const clearVisualization = () => {
        setglobeAttributes({
            globeImageUrl: earthTexture,
            hexBinPointsData: [],
            hexAltitude: 0,
            heatmapsData: [],
            polygonsData: [],
        })

    };

    const handleDataTableVisibility = (e) => {
        setIsDataTableVisble(!isDataTableVisble);
    };

    const getStartedButton = () => {
        if (isHomePageVisible) {
            globeEl.current.controls().autoRotate = false;
            globeEl.current.pointOfView({ lat: 20.5937, lng: 78.962, altitude: 1.2 }, 2000);
        }
        else {
            let clearData = {
                globeImageUrl: earthTexture,
                hexBinPointsData: [],
                hexAltitude: 0,
                heatmapsData: [],
                polygonsData: [],
            }
            clearData["labelsData"] = []
            clearData["labelLat"] = () => { }
            clearData["labelLng"] = () => { }
            clearData["labelText"] = () => { }
            setglobeAttributes(clearData)
            globeEl.current.controls().autoRotate = true;
            globeEl.current.pointOfView({ altitude: 1.8 }, 2000);
        }
        setIsHomePageVisible(!isHomePageVisible)
        setFadeHomePage(!fadeHomePage)
    }

    const loadCarbonEmissionData = () => {
        return new Promise((resolve, reject) => {
            fetch(countryCodeCSV).then(res => res.text())
                .then(csvParse)
                .then(countries => {
                    let countryCode = new Map()
                    countries.forEach(row => {
                        if (row.country != "" && row.latitude != "" && row.longitude != "") {
                            countryCode.set(row.country, {
                                country: row.name,
                                lat: parseFloat(row.latitude),
                                lng: parseFloat(row.longitude)
                            })
                        }
                    });
                    setCountryCodeData(countryCode)

                    let emissionData = []
                    fetch(carbonEmissionCSV).then(res => res.text())
                        .then(csvParse)
                        .then(emissionList => {

                            let emissionMap = []
                            emissionList.forEach(row => {
                                let data = countryCode.get(row.COUNTRY)
                                if (data) {
                                    let emission = parseFloat(row["2023"]).toFixed(5)
                                    emissionData.push(emission)
                                    emissionMap.push({ lat: data["lat"], lng: data["lng"], data: emission, countryCode: row.COUNTRY, country: data["country"] })
                                }
                            })
                            globeEl.current.controls().autoRotateSpeed = -0.35;
                            globeEl.current.pointOfView({}, 2000);

                            let normalizedEmissionList = normalizeVisualizationData(emissionMap, minMaxData.min, minMaxData.max)
                            // console.log(normalizedEmissionList)
                            setVisData(normalizedEmissionList)
                            resolve()
                        })
                });
        })
    }


    const loadPopulationData = () => {
        return new Promise((resolve, reject) => {
            fetch(countryCodeCSV).then(res => res.text())
                .then(csvParse)
                .then(countries => {
                    let countryCode = new Map()
                    countries.forEach(row => {
                        if (row.country != "" && row.latitude != "" && row.longitude != "") {
                            countryCode.set(row.country, {
                                country: row.name,
                                lat: parseFloat(row.latitude),
                                lng: parseFloat(row.longitude)
                            })
                        }
                    });
                    setCountryCodeData(countryCode)

                    let emissionData = []
                    fetch(populationCSV).then(res => res.text())
                        .then(csvParse)
                        .then(emissionList => {

                            let emissionMap = []
                            emissionList.forEach(row => {
                                let data = countryCode.get(row.COUNTRY)
                                if (data) {
                                    let emission = parseFloat(row["2023"]).toFixed(5)
                                    emissionData.push(emission)
                                    emissionMap.push({ lat: data["lat"], lng: data["lng"], data: emission, countryCode: row.COUNTRY, country: data["country"] })
                                }
                            })

                            globeEl.current.controls().autoRotateSpeed = -0.35;
                            globeEl.current.pointOfView({}, 2000);

                            let normalizedEmissionList = normalizeVisualizationData(emissionMap, minMaxData.min, minMaxData.max)
                            setVisData(normalizedEmissionList)
                            resolve()
                        })
                });
        })
    }

    // Load GeoJSON data on first render
    useEffect(() => {
        fetch(country_geoJson).then(res => res.json())
            .then(countries => {
                setCountryBounds(countries);
            });
    }, []);


    // Load CSV data on first render
    useEffect(() => {
        globeEl.current.controls().autoRotate = true;
        loadCarbonEmissionData()
    }, []);

    // Set and render globe visualization data on load
    useEffect(() => {
        if (globeEl.current) {
            let globeSettings = {};
            if (visualization === 'hex') {
                globeSettings = {
                    globeImageUrl: earthTexture,
                    bumpImageUrl: earthBump,
                    heatmapsData: [],
                    polygonsData: [],
                    hexBinPointsData: visData,
                    hexBinPointWeight: "data",
                    hexBinResolution: 4,
                    hexBinMerge: true,
                    enablePointerInteraction: false
                }
                globeSettings['hexAltitude'] = d => d.sumWeight * 2;
                globeSettings['hexTopColor'] = d => weightColor(d.sumWeight * 2);
                globeSettings['hexSideColor'] = d => weightColor(d.sumWeight * 2);
                globeSettings["polygonLabel"] = () => { }
                globeSettings["onPolygonHover"] = () => { }
            }
            else if (visualization === 'heatmap') {
                globeSettings = {
                    globeImageUrl: earthTexture,
                    bumpImageUrl: earthBump,
                    hexBinPointsData: [],
                    polygonsData: [],
                    heatmapsData: [visData],
                    heatmapPointLat: "lat",
                    heatmapPointLng: "lng",
                    heatmapPointWeight: "data",
                    heatmapBaseAltitude: 0,
                    heatmapTopAltitude: 0,
                    heatmapsTransitionDuration: 0,
                    enablePointerInteraction: false,
                }
                globeSettings["polygonLabel"] = () => { }
                globeSettings["onPolygonHover"] = () => { }
            }
            else if (visualization == "borders") {
                globeSettings = {
                    globeImageUrl: earthTexture,
                    bumpImageUrl: earthBump,
                    heatmapsData: [],
                    hexBinPointsData: [],
                    polygonAltitude: 0.008,

                }
                globeSettings["polygonsData"] = countryBounds.features
                globeSettings["polygonCapColor"] = (d) => {
                    if (visData.length > 0) {
                        let a = visData.filter(x => x.countryCode == d.properties.ADM0_A3_IS)
                        let rgbgen = a.length > 0 ? generateRGB(a[0].data, minMaxData.min, minMaxData.max) : 'rgba(0, 100, 0, 0.7)'
                        return rgbgen
                    }
                }
                globeSettings["polygonLabel"] = ({ properties: d }) => {
                    if (Array.isArray(visData) && visData.length > 0) {
                        let a = visData.filter(x => x.countryCode == d.ADM0_A3_IS)
                        if (a.length > 0) {
                            return (`<b>${d.ADMIN} (${d.ISO_A2})</b> <br />
                            <b>(${a[0].unNormalizedData})</b>
                            `)
                        }
                        else {
                            return (
                                `<b>${d.ADMIN} (${d.ISO_A2})</b> <br />
                                <b>(Data Unavailable)</b>
                                `
                            )
                        }
                    }
                }
                globeSettings["onPolygonHover"] = setPolygonHoverActive
            }
            else if (visualization == "none") {
                globeSettings = {
                    globeImageUrl: earthTexture,
                    hexBinPointsData: [],
                    hexAltitude: 0,
                    heatmapsData: [],
                    polygonsData: [],
                }
            }

            if (isCountryNameVisible) {
                globeSettings["labelsData"] = visData
                globeSettings["labelResolution"] = 6
                globeSettings["labelAltitude"] = 0.01
                globeSettings["labelColor"] = () => 'rgba(255,255,255, 1)'
                globeSettings["labelLat"] = d => d.lat
                globeSettings["labelLng"] = d => d.lng
                globeSettings["labelText"] = d => d.country
                globeSettings["labelSize"] = 0.5
                globeSettings["labelsTransitionDuration"] = 0
            }
            else {
                globeSettings["labelsData"] = []
                globeSettings["labelLat"] = () => { }
                globeSettings["labelLng"] = () => { }
                globeSettings["labelText"] = () => { }
            }
            setglobeAttributes(globeSettings)
        }
    }, [visualization, visData, isCountryNameVisible, earthTexture])



    return (
        <div id="canvas">
            <Globe
                ref={globeEl}
                {...globeAttributes}
            />

            <div className="select-none pointer-events-none w-full h-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {
                    !isHomePageVisible &&
                    <div className="pointer-events-auto grid grid-cols-1 gap-4 justify-left bg-red-100 w-full">
                        <div className="absolute left-0 top-0 w-3/12">
                            <div className="grid grid-cols-2 gap-0 place-items-center">
                                <div className='justify-center w-full px-2 py-3'>
                                    <button onClick={handleIsVisModeDropDownOpen} id="dropdownDefaultButton" data-dropdown-toggle="dropdown" className="text-white w-full bg-blue-700 hover:bg-blue-800 focus:outline-none font-medium rounded-lg text-sm px-2 py-3 text-center inline-flex items-center justify-center dark:bg-blue-600 dark:hover:bg-blue-700" type="button">Visualization Type <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                                    </svg>
                                    </button>

                                    <div id="dropdown" className={`z-10 ${isVisModeDropDownOpen ? "block" : "hidden"} absolute w-1/2 text-center bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700`}>
                                        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                                            <li>
                                                <a id="hex" onClick={handleToggleVisualization} className="block py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Bars</a>
                                            </li>
                                            <li>
                                                <a id="heatmap" onClick={handleToggleVisualization} className="block py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">HeatMap</a>
                                            </li>
                                            <li>
                                                <a id="borders" onClick={handleToggleVisualization} className="block py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Country Borders</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className='justify-center w-full px-2 py-3'>
                                    <button onClick={handleIsVisDataDropDownOpen} id="dropdownDefaultButton" data-dropdown-toggle="dropdown" className="text-white w-full bg-blue-700 hover:bg-blue-800 focus:outline-none font-medium rounded-lg text-sm px-2 py-3 text-center inline-flex items-center justify-center dark:bg-blue-600 dark:hover:bg-blue-700" type="button">Visualization Data<svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                                    </svg>
                                    </button>

                                    <div id="dropdown" className={`z-10 ${isVisDataDropDownOpen ? "block" : "hidden"} absolute w-1/2 text-center bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700`}>
                                        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                                            <li>
                                                <a id="carbon_emission" onClick={handleToggleData} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Carbon Emission</a>
                                            </li>
                                            <li>
                                                <a id="world_population" onClick={handleToggleData} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">World Population</a>
                                            </li>
                                            <li>
                                                <a id="ozone_depletion" onClick={handleToggleData} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Ozone Depletion</a>
                                            </li>
                                            <li>
                                                <a id="forest_area" onClick={handleToggleData} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Forest Area</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className='justify-center w-full px-2 '>
                                    <a onClick={handleCountryNameVisibility} className="relative w-full inline-flex items-center justify-center px-3 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                                        <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-blue-600 rounded-full group-hover:w-full group-hover:h-56"></span>
                                        <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                                        <span className="relative text-sm">{isCountryNameVisible ? "Hide" : "Show"} Country Names</span>
                                    </a>
                                </div>

                                <div className='justify-center w-full px-2 '>
                                    <a onClick={handleEarthTexture} className="relative w-full inline-flex items-center justify-center px-3 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                                        <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-blue-600 rounded-full group-hover:w-full group-hover:h-56"></span>
                                        <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                                        <span className="relative text-sm">Toggle {isEarthDay ? "Night" : "Day"} time</span>
                                    </a>
                                </div>
                            </div>


                            <div className='w-full px-3 py-3'>
                                <a onClick={handleDataTableVisibility} className="relative w-full inline-flex items-center justify-center px-5 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                                    <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-yellow-500 rounded-full group-hover:w-full group-hover:h-56"></span>
                                    <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                                    <span className="relative text-sm">{isDataTableVisble ? "Hide" : "Show"} Data as Table</span>
                                </a>
                            </div>

                            <div className='w-full px-3'>
                                <a onClick={clearVisualization} className="relative w-full inline-flex items-center justify-center px-5 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                                    <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-red-500 rounded-full group-hover:w-full group-hover:h-56"></span>
                                    <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                                    <span className="relative text-sm">Clear Visualization</span>
                                </a>
                            </div>
                        </div>

                        <div className="absolute left-0 bottom-0 w-2/12 mx-2 my-4 text-white text-left  ">
                            <a onClick={getStartedButton} className="relative  inline-flex items-center justify-center px-3 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-blue-600 rounded-full group-hover:w-full group-hover:h-56"></span>
                                <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                                <span className="relative text-sm">Go Back</span>
                            </a>
                        </div>
                    </div>
                }

                {
                    <HomePage isHomePageVisible={isHomePageVisible} fadeHomePage={fadeHomePage} getStartedButton={getStartedButton} />
                }

                <div className="pointer-events-auto overflow-scroll no-scrollbar absolute right-0 top-0 w-2/12 h-full mx-5 px-2 my-2 py-2">
                    {
                        visData.length > 0 && !isHomePageVisible && isDataTableVisble &&
                        <table className="h-full overflow-scroll backdrop-blur-sm bg-white bg-opacity-50 border border-gray-200">
                            <thead className=''>
                                <tr>
                                    {Object.keys(visData[0]).map((key) => (
                                        <th
                                            key={key}
                                            className="px-6 py-3 border-b border-gray-200 backdrop-blur-sm bg-white bg-opacity-50 text-left text-xs font-medium text-back-500 uppercase tracking-wider"
                                        >
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visData.map((row) => (
                                    <tr key={"country"}>
                                        {Object.values(row).map((value, index) => (
                                            <td
                                                key={value.COUNTRY}
                                                className="px-6 py-4 whitespace-nowrap border-b border-gray-200"
                                            >
                                                {value}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    }
                </div>
                {
                    <div className={`select-none transition-opacity duration-1000 ${fadeNotification ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} absolute top-2.5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mx-2 my-4 text-white text-left`}>
                        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                            <strong class="font-bold">Feature not implemented !</strong>
                        </div>

                    </div>
                }
                {/* <CSVReader/> */}
            </div>
        </div>
    )
}


export default Globe3D