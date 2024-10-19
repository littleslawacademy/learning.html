// Function to populate video options based on selected journey
function populateVideos(journey) {
    const videoDropdown = document.getElementById("videoLinks");
    videoDropdown.innerHTML = ''; // Clear previous options

    const journeys = {
        journey1: [
            { name: "Day 01 - Performance Testing with JMeter", url: "https://www.youtube.com/embed/W4npOeZBfE0?si=nEIJRJcQat3W2N0P" },
            { name: "Day 02 - Creating an Effective Performance Testing Plan", url: "https://www.youtube.com/embed/nyHUC2cUAtc?si=jIvPZTB-okBSTnLq" },
            { name: "Day 03 - Performance Test Designing Step by step", url: "https://www.youtube.com/embed/O9JnRvuBQSU?si=lqY83KFul_iwoRnZ" },
            { name: "Day 04 - How Workload modelling works", url: "https://www.youtube.com/embed/Zss8SWnWXzk?si=1_Pj3jCmi6orGFb0" },
            { name: "Day 05 - How to Record HTTP(S) Script in JMeter", url: "https://www.youtube.com/embed/npLx4BUZJg4?si=dO6DzZG4YiIXdcTR" },
            { name: "Day 06 - How to Estimate effort for Performance test script and Create api Script", url: "https://www.youtube.com/embed/_q9HGJTATXA?si=cYykxObxqExV-md9" },
            { name: "Day 07 - How to do Parameterization in JMeter", url: "https://www.youtube.com/embed/jozXa-pSik0?si=to1Omc0jodh4U01S" },
            { name: "Day 08 - How to do Correlation in JMeter", url: "https://www.youtube.com/embed/aYoqh6J8TfA?si=SFXUNtoVv2aMFtqE" },
            { name: "Day 09 - Why is Smoke Test necessary in Performance Testing", url: "https://www.youtube.com/embed/v84HCbYdG0w?si=xnHM78U67JZk90eu" },
            { name: "Day 10 - How to Run a Load Test in JMeter using Ultimate Thread Group", url: "https://www.youtube.com/embed/nlcjBk51oJo?si=5s510_SNP0mAosk-" },
            { name: "Day 11 - How to use Open Model Thread Group in JMeter", url: "https://www.youtube.com/embed/r0DPQHdddoA?si=UrZYvAq0Hp_trPVN" },
            { name: "Day 12 - How to use Arrivals Thread Group in JMeter", url: "https://www.youtube.com/embed/Zhm3_QZm2Ys?si=OxLV6IzXTfN78YOS" },
            { name: "Day 13 - How to use Concurrency Thread Group for Load testing", url: "https://www.youtube.com/embed/r4iJ8NYQSaY?si=XKnRExP5eBvQKMM4" },
            { name: "Day 14 - How to Prepare and Analyze Load Test Report", url: "https://www.youtube.com/embed/atzO7GqDAd8?si=BV_ndIYQ1YB1Fung" },
            { name: "Day 15 - How to use Concurrency Thread group in JMeter with multiple scripts", url: "https://www.youtube.com/embed/_t25BGdl7sc?si=j-73AflSiDZYWD1X" },
            { name: "Day 16 - How to execute Stress test using JMeter ", url: "https://www.youtube.com/embed/FKIxgMQ7kOk?si=-5fzd50OH-78Q58T" },
            { name: "Day 00 - How to install JMeter in Windows 11", url: "https://www.youtube.com/embed/ypnGdx2syqw?si=X2X0Psi6Fax1L6hy" },
            { name: "Day 00 - How to Generate Html report in JMeter in GUI Mode", url: "https://www.youtube.com/embed/9c81ZMwdPzo?si=ow1xmYffEERfVIXc" },
            { name: "Day 17 - How to create Summary report after JMeter Load Test", url: "https://www.youtube.com/embed/0I7--KdO4Hk?si=VCVcFQsHV_JDVn7a" }
        ],
        journey2: [
            { name: "Day 01 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/N3imKuHlSaA?si=zTVz-bicIE-nZ6HF" },
            { name: "Day 02 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/1YlIHGK23HA?si=HlCS3xDM6RFxBaG7" },
            { name: "Day 03 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/55r24Gbzigg?si=2U64eNBHsABkS_HV" },
            { name: "Day 04 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/-gpRQHG1kbE?si=SMtYIprz8lKqYIB8" },
            { name: "Day 05 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/j_5IUYbIIcc?si=jyp1uuM9Ag8faafm" },
            { name: "Day 06 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/mGKA0kPQ2OE?si=inMPt6CizXDW1_H7" },
            { name: "Day 07 - JMeter Bootcamp in Tamil", url: "https://www.youtube.com/embed/34fKn4iK6S8?si=F4ZYZEWiLcfLzMd0" }
        ],
        journey3: [
            { name: "JMeter BootCamp", url: "https://www.youtube.com/embed/Kf-Og2kvroE?si=53HMs1kx0Q6UTpsX" },
            { name: "Performance Engineering Bootcamp", url: "https://www.youtube.com/embed/dV4gsabeTaw?si=E5TmELQfDsgpsorc" },
            { name: "Neoload Bootcamp", url: "https://www.youtube.com/embed/e82khDc8iJg?si=xFkhuX_dy0NCvKGC" },
            { name: "Neoload Bootcamp | How to Collaborate Neoload with GitHub", url: "https://www.youtube.com/embed/G4mZQr65oRE?si=x22Nsr6FcTo1Fvim" },
            { name: "How to Integrate Apache JMeter with Azure DevOps", url: "https://www.youtube.com/embed/68JFyzcMU3M?si=D2IayvouvNacdvcg" },
            { name: "JMeter with GitLab Integration", url: "https://www.youtube.com/embed/VkJ0HDxT-tk?si=wxKJ3TR4NtuOpK2b" },
            { name: "Challenges and Our Approach to Overcome Them in Collecting NFR for Performance Testing ", url: "https://www.youtube.com/embed/qJrQ213qH-M?si=QxFkApI4b4hwZaKN" },
        ],
        journey4: [
            { name: "Video 4.1", url: "https://www.example.com/video4_1" },
            { name: "Video 4.2", url: "https://www.example.com/video4_2" },
            { name: "Video 4.3", url: "https://www.example.com/video4_3" }
        ],
        journey5: [
            { name: "Video 5.1", url: "https://www.example.com/video5_1" },
            { name: "Video 5.2", url: "https://www.example.com/video5_2" },
            { name: "Video 5.3", url: "https://www.example.com/video5_3" }
        ]
    };

    if (journey && journeys[journey]) {
        journeys[journey].forEach(video => {
            const option = document.createElement("option");
            option.value = video.url;
            option.textContent = video.name;
            videoDropdown.appendChild(option);
        });
    } else {
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a video";
        videoDropdown.appendChild(defaultOption);
    }
}

// Function to open the selected video link
function openVideo(url) {
    if (url) {
        window.open(url, '_blank');
    }
}
