export default function DataTable ({tableData, tableKey=""}){
    if(tableData[tableKey] == undefined){
        console.log("Ughhh")
        return <></>
    }
    console.log("Proceeding..")
    return <div className="container mx-auto p-4">
        <table className="min-w-full bg-white border border-gray-200">
            <thead>
                <tr>
                    {Object.keys(tableData[tableKey]).map((key) => (
                        <th
                            key={key}
                            className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                            {key}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {tableData.map((row) => (
                    <tr key={tableKey}>
                        {Object.values(row).map((value, index) => (
                            <td
                                key={index}
                                className="px-6 py-4 whitespace-nowrap border-b border-gray-200"
                            >
                                {value}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
}
