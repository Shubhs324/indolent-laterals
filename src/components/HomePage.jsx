export default function HomePage({ isHomePageVisible, fadeHomePage, getStartedButton }) {
    return (
        <div id='homePageDiv' className={`select-none transition-opacity duration-500 ${fadeHomePage ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}  w-full h-full flex flex-col min-h-screen text-center justify-center items-center`}>
            <div className='text-7xl text-white drop-shadow-lg font-medium'>Global Data Visualizer</div>
            <div className=' text-2xl text-white py-5 drop-shadow-lg'>Turning Data into Discoveries<br></br>See the World, One Visualization at a Time</div>
            <div className='py-2' onClick={getStartedButton}>
                <a className="text-xl relative inline-flex items-center justify-center p-4 px-6 py-3 overflow-hidden font-medium text-white transition duration-300 ease-out border-2 border-white rounded-full shadow-md group hover:cursor-pointer">
                    <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-blue-600 group-hover:translate-x-0 ease">
                        <svg className='text-white stroke-white stroke-2' width="24" height="24" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd"><path d="M21.883 12l-7.527 6.235.644.765 9-7.521-9-7.479-.645.764 7.529 6.236h-21.884v1h21.883z" /></svg>
                    </span>
                    <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">Get Started</span>
                    <span className="relative invisible">Button Text</span>
                </a>
            </div>
        </div>
    );
  }