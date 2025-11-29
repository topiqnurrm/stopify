import { NextResponse } from 'next/server';

export async function GET() {
    // const type = {
    //     SED : "Sedih",
    //     NATI : "Nada Tinggi",
    // };

    const playlist = {
        MYLK : "My Like",
        CB : "coba",
        SED : "Sedih",
        NATI : "Nada Tinggi",
    };

    const data = [
        {
            id: 358,
            judul: "358. Where Have You Been, Rihanna",
            //type: "NATI",
            link: "https://www.youtube.com/watch?v=FF3s3gJ-ZK4",
            images: [
                "/music/358.mp3",
            ],
            tahun: "August 2023",
            playlist : [
                "MYLK",
                "CB",
            ],
        },
        {
            id: 1,
            judul: "1. Death Bed, powfu, beabadoobee",
            link: "https://www.youtube.com/watch?v=YefncL4TagU",
            images: [
                "/music/1.mp3",
            ],
            tahun: "August 2023",
            playlist : [
                "MYLK",
            ],
        },
        {
            id: 2,
            judul: "358. Where Have You Been, Rihanna",
            link: "https://www.youtube.com/watch?v=FF3s3gJ-ZK4",
            images: [
                "/music/358.mp3",
            ],
            tahun: "August 2023",
            playlist : [
                "MYLK",
            ],
        },
        {
            id: 3,
            judul: "358. Where Have You Been, Rihanna",
            link: "https://www.youtube.com/watch?v=FF3s3gJ-ZK4",
            images: [
                "/music/358.mp3",
            ],
            tahun: "August 2023",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
    ];

    return NextResponse.json(data);
}