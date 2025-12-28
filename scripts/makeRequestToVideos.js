
async function makeBackendRequest() {
    const query = '23:45'

    const response = await fetch(`http://localhost:3000/videos?time=${encodeURIComponent(query)}&skipCache=true&range=60&page=3`);

    // console.log(response);
    const data = await response.json();
    console.log(data);

    data.videos.forEach(item => {
        console.log(item.time)
    });
}
makeBackendRequest().catch(console.error);

