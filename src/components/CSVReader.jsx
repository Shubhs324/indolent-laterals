import React, { useState } from 'react';
import * as d3 from 'd3';

const CSVReader = () => {
    const [data, setData] = useState([]);

    // Function to handle file input change
    const handleFileChange = (event) => {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const parsedData = d3.csvParse(text);
                setData(parsedData);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div>
            <h1>CSV File Reader</h1>
            <input type="file" accept=".csv" onChange={handleFileChange} />
            {data.length > 0 && (
                <div>
                    <h2>Parsed Data:</h2>
                    <table>
                        <thead>
                            <tr>
                                {Object.keys(data[0]).map((key) => (
                                    <th key={key}>{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index}>
                                    {Object.values(row).map((value, i) => (
                                        <td key={i}>{value}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CSVReader;