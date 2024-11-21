import React, { useState, useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import earthDiffuse from "../../src/assets/earth_day.jpg"
import earthDiffuse2 from "../../src/assets/earth_day_2.jpg"
import earthNightDiffuse from "../../src/assets/earth_night.jpg"
import earthBump from "../../src/assets/earth_bump.jpg"
import { csvParse, scaleSequentialSqrt, interpolateYlOrRd } from 'd3';
import countryCodeCSV from "../../src/assets/countries.csv"
import carbonEmissionCSV from "../../src/assets/carbon_emission.csv"
import country_geoJson from "../ne_110m_admin_0_countries.geojson?url";

const Globe3D = () => {
    const [countryBounds, setCountryBounds] = useState({ features: [] });
    const [visData, setVisData] = useState([]);
    const [minMaxData, setMinMaxData] = useState({ min: 0, max: 1 });
    const [globeAttributes, setglobeAttributes] = useState({});
    const [visualization, setVisualization] = useState('borders'); // 'hex' or 'heatmap' or 'borders'
    const [isVisModeDropDownOpen, setIsVisModeDropDownOpen] = useState(false); // 'hex' or 'heatmap' or 'borders'
    const globeEl = useRef();

    const handleIsVisModeDropDownOpen = () => {
        setIsVisModeDropDownOpen(!isVisModeDropDownOpen);
    };

    const weightColor = scaleSequentialSqrt(interpolateYlOrRd)
        .domain([0, 1e7]);

    const normalizeEmissions = (data, newMin, newMax) => {
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

    const generateRGB = (value, minValue, maxValue) => {
        const clampedValue = Math.max(minValue, Math.min(maxValue, value));
        const normalizedValue = (clampedValue - minValue) / (maxValue - minValue);
        const red = Math.floor(255 * normalizedValue);
        const green = 0; // Adjust this to get different color ranges
        const blue = Math.floor(255 * (1 - normalizedValue));
        return `rgba(${red}, ${green}, ${blue}, 0.4)`;
    }

    useEffect(() => {
        fetch(country_geoJson).then(res => res.json())
            .then(countries => {
                setCountryBounds(countries);
            });
    }, []);


    useEffect(() => {
        fetch(countryCodeCSV).then(res => res.text())
            .then(csvParse)
            .then(countries => {
                var countryCodeData = new Map()
                countries.forEach(row => {
                    if (row.country != "" && row.latitude != "" && row.longitude != "") {
                        countryCodeData.set(row.country, {
                            country: row.name,
                            lat: parseFloat(row.latitude),
                            lng: parseFloat(row.longitude)
                        })
                    }
                });

                var emissionData = []
                fetch(carbonEmissionCSV).then(res => res.text())
                    .then(csvParse)
                    .then(emissionList => {

                        var emissionMap = []
                        emissionList.forEach(row => {
                            var data = countryCodeData.get(row.COUNTRY)
                            if (data) {
                                var emission = parseFloat(row["2022"]).toFixed(5)
                                emissionData.push(emission)
                                emissionMap.push({ lat: data["lat"], lng: data["lng"], data: emission, countryCode: row.COUNTRY, country: data["country"] })
                            }
                        })

                        // Set the current view of globe to India
                        globeEl.current.pointOfView({ lat: 20.5937, lng: 78.962, altitude: 1.3 }, 2000);

                        var normalizedEmissionList = normalizeEmissions(emissionMap, minMaxData.min, minMaxData.max)
                        setVisData(normalizedEmissionList)
                    })
            });
    }, []);

    useEffect(() => {
        if (globeEl.current) {
            if (visualization === 'hex') {
                var attr = {
                    globeImageUrl: earthDiffuse2,
                    bumpImageUrl: earthBump,
                    heatmapsData: [],
                    polygonsData: [],
                    hexBinPointsData: visData,
                    hexBinPointWeight: "data",
                    hexBinResolution: 4,
                    hexBinMerge: true,
                    enablePointerInteraction: false

                }
                attr['hexAltitude'] = d => d.sumWeight * 2;
                attr['hexTopColor'] = d => weightColor(d.sumWeight * 2);
                attr['hexSideColor'] = d => weightColor(d.sumWeight * 2);
                setglobeAttributes(attr)
            }
            else if (visualization === 'heatmap') {
                setglobeAttributes({
                    globeImageUrl: earthDiffuse2,
                    bumpImageUrl: earthBump,
                    hexBinPointsData: [],
                    polygonsData: [],
                    heatmapsData: [visData],
                    heatmapPointLat: "lat",
                    heatmapPointLng: "lng",
                    heatmapPointWeight: "data",
                    heatmapTopAltitude: 0,
                    heatmapsTransitionDuration: 0,
                    enablePointerInteraction: false,
                })
            }
            else if (visualization == "borders") {
                var attr = {
                    globeImageUrl: earthDiffuse2,
                    bumpImageUrl: earthBump,
                    heatmapsData: [],
                    hexBinPointsData: [],
                    polygonAltitude: 0.008,
                    labelsData: visData,
                    labelResolution: 6,
                    labelAltitude: 0.01,
                    labelColor: () => 'rgba(255,255,255, 1)'
                }
                attr["labelLat"]= d => d.lat
                attr["labelLng"]= d => d.lng
                attr["labelText"]= d => d.country
                attr["labelSize"]= 0.5

                attr["polygonsData"] = countryBounds.features
                attr["polygonCapColor"] = (d) => {
                    var a = visData.filter(x => x.countryCode == d.properties.ADM0_A3_IS)
                    var rgbgen = a.length > 0 ? generateRGB(a[0].data, minMaxData.min, minMaxData.max) : 'rgba(0, 100, 0, 0.4)'
                    return rgbgen
                }
                attr["polygonLabel"] = ({ properties: d }) => {
                    var a = visData.filter(x => x.countryCode == d.ADM0_A3_IS)
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
                setglobeAttributes(attr)
            }
        }
    }, [visualization, visData])

    

    const clearVisualization = () => {
        setglobeAttributes({
            globeImageUrl: earthDiffuse,
            hexBinPointsData: [],
            hexAltitude: 0,
            heatmapsData: [],
            polygonsData: [],
        })

    };

    return (
        <div id="canvas">
            <Globe
                ref={globeEl}
                {...globeAttributes}

            />

            <div className="pointer-events-none w-full h-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="pointer-events-auto flex justify-left bg-red-100 w-full">
                    <div>
                        <a onClick={handleToggleVisualization} className="relative inline-flex items-center justify-center px-5 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                            <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-green-500 rounded-full group-hover:w-56 group-hover:h-56"></span>
                            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                            <span className="relative text-sm">Toggle Visualization</span>
                        </a>

                        <a onClick={clearVisualization} className="relative inline-flex items-center justify-center px-5 py-3 overflow-hidden font-mono font-medium tracking-tighter text-white bg-gray-800 rounded-lg group">
                            <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-red-500 rounded-full group-hover:w-56 group-hover:h-56"></span>
                            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                            <span className="relative text-sm">Clear Visualization</span>
                        </a>
                    </div>
                    <br />

                    <div>
                        <button onClick={handleIsVisModeDropDownOpen} id="dropdownDefaultButton" data-dropdown-toggle="dropdown" className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none font-medium rounded-lg text-sm px-5 py-3 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700" type="button">Visualization Type <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                        </svg>
                        </button>

                        <div id="dropdown" className={`z-10 ${isVisModeDropDownOpen ? "block" : "hidden"} absolute bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700`}>
                            <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                                <li>
                                    <a id="hex" onClick={handleToggleVisualization} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Bars</a>
                                </li>
                                <li>
                                    <a id="heatmap" onClick={handleToggleVisualization} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">HeatMap</a>
                                </li>
                                <li>
                                    <a id="borders" onClick={handleToggleVisualization} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Country Borders</a>
                                </li>
                            </ul>
                        </div>
                    </div>


                </div>
                {/* <CSVReader/> */}
            </div>
        </div>
    )
}


export default Globe3D