import React, { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { ReactFileReader } from 'react-file-reader';
import Globe from 'react-globe.gl';
import earthDiffuse from "../src/assets/earth_day.jpg"
import earthNightDiffuse from "../src/assets/earth_night.jpg"
import earthNormal from "../src/assets/earth_bump.jpg"
import { csvParse, csv, scaleSequentialSqrt, interpolateYlOrRd } from 'd3';
import countryCodeCSV from "../src/assets/countries.csv"
import carbonEmissionCSV from "../src/assets/carbon_emission.csv"
import CSVReader from './components/CSVReader';

function normalize(min, max) {
	var delta = max - min;
	return function (val) {
		return (val - min) / delta;
	};
}

function App() {
	const [popData, setPopData] = useState([]);
	const [globeData, setGlobeData] = useState(new Map())
	const [file, setFile] = useState([])

	const weightColor = scaleSequentialSqrt(interpolateYlOrRd)
		.domain([0, 1e7]);

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
				// popData.push({lat:20.5937, lng:78.962, emission:1283.02})
				fetch(carbonEmissionCSV).then(res => res.text())
					.then(csvParse)
					.then(emissionList => {
						var normalizedEmissionList = new Map()
						emissionList.forEach(row => {
							var data = countryCodeData.get(row.COUNTRY)
							if (data) {
								var emission = parseFloat(row["2022"]).toFixed(5)
								emissionData.push(emission)
								popData.push({ lat: data["lat"], lng: data["lng"], emission: emission })
							}
							// if(row.COUNTRY == "IND"){
							// 	console.log("Found India:", parseFloat(data["lat"]), parseFloat(data["lng"]))
							// }
						})

						var minRange = 0, maxRange = 1
						var oldMinRange = Math.min(...emissionData), oldMaxRange = Math.max(...emissionData)
						console.log("Min and max values are:", oldMinRange, oldMaxRange)

						popData.forEach((num, index) => {
							var normalizedValInRange = ((num - oldMinRange) / (oldMaxRange - oldMinRange)) * (maxRange - minRange) + maxRange
							// normalizedEmissionList.push({normalizedValue})
						});
					})
				console.log("Output: ", countryCodeData.get("AFG"))
			});
	}, []);

	return <>

		<div id="canvas">
			{/* <Globe
				globeImageUrl={earthDiffuse}
				bumpImageUrl={earthNormal}
				hexBinPointsData={popData}
				hexBinPointWeight="emission"
				hexAltitude={d => d.sumWeight * 8e-4}
				hexBinResolution={4}
				hexTopColor={d => weightColor(d.sumWeight)}
				hexSideColor={d => weightColor(d.sumWeight)}
				hexBinMerge={true}
				enablePointerInteraction={false}
			/> */}

			{/* <Globe
				globeImageUrl={earthDiffuse}
				bumpImageUrl={earthNormal}
				heatmapsData={[popData]}
				heatmapPointLat="lat"
				heatmapPointLng="lng"
				heatmapPointWeight="emission"
				heatmapTopAltitude={0}
				heatmapsTransitionDuration={3000}
				enablePointerInteraction={true}
				onHeatmapClick={heatMapClick}
			/> */}

			<Globe
				globeImageUrl={earthDiffuse}
				pointsData={popData}
				pointLabel="emission"
				pointColor="red"
			/>
			<div className="canvas_overlay">
				{/* <h1>YAY THIS IS OVER THE CANVAS</h1> */}
				{/* <CSVReader/> */}
			</div>
		</div>

	</>
}

export default App
