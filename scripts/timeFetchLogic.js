// If a time is requested we should provide the response with times before and afte rthe range

//  so we request 12:00 with range 60 we get 11:30 to 12:30 (60 minutes before and after)
//  if we get 23:30 we should wrap around to 00:30
//  We should convert the time and then fetch the videos

async function getTheTimesInRange(centerTime, range) {

    // convert the time to minutes
    const [hours, minutes] = centerTime.split(':').map(Number);
    const centerMinutes = hours * 60 + minutes;

    const start = (centerMinutes - range + 1440) % 1440;
    const end = (centerMinutes + range) % 1440;

    for (let i = 0; i < range * 2; i++) {
        const time = (start + i) % 1440;
        const h = Math.floor(time / 60).toString().padStart(2, '0');
        const m = (time % 60).toString().padStart(2, '0');
        console.log(`${h}:${m}`);
    }

    console.log(start, end);
    console.log(centerMinutes);

}

getTheTimesInRange('23:45', 60).catch(console.error);