import { csvParse } from 'd3';

const parseCSVData = (file, key="") => {
    return new Promise((resolve, reject) => {
        fetch(file).then(res => res.text())
        .then(csvParse)
        .then(data => {
            if(data.length <= 0){
                reject(new Error("Invalid CSV file/data"))
            }
            let csvData = []
            let csvCols = Object.keys(data[0])
            
            // let csvColsLowerCase = Object.keys(data[0]).map(function(col) {
            //     return col.toString().toLowerCase();
            // });
            
            data.forEach(row => {
                let data2 = {}
                csvCols.forEach(col => {
                    data2[col] = row[col]
                })
                csvData.push(data2)
            });
            resolve(csvData)
        })
    })
    
}

export default parseCSVData;