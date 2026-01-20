import { NextResponse } from 'next/server';

export async function GET() {
    const data = [
        {
            id: 360,
            judul: "Tabola Bale, Silet Open Up, Jacson Seran, Juan Reza, Diva Aurel",
            link: "https://www.youtube.com/watch?v=ztK0A6cmyRQ",
            tahun: "2025 April 03",
            added: "13 Desember 2025",
            playlist : [
                "b",
                "2", "g", "8", "9",
            ],
        },
        {
            id: 359,
            judul: "Sedia Aku Sebelum Hujan, Idgitaf",
            link: "https://www.youtube.com/watch?v=0UT_QyO3ZLQ",
            tahun: "2025 Oktober 08",
            added: "13 Desember 2025",
            playlist : [
                "b",
                "3", "h", "7", "9",
            ],
        },
        {
            id: 358,
            judul: "Where Have You Been, Rihanna",
            //type: "NATI",
            link: "https://www.youtube.com/watch?v=FF3s3gJ-ZK4",
            // images: [
            //     // "/music/358.mp3",
            //     "https://drive.google.com/file/d/15WiaejmDrp1Ojmyy5lX9p3GyTG9guy3K/view?usp=drive_link",
            // ],
            tahun: "2012",
            added: "9 November 2025",
            playlist : [
                "b",
                "1", "6", "7", "60",
            ],
        },
    ];

    return NextResponse.json(data);
}