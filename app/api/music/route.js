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
            // images: [
            //     // "/music/358.mp3",
            //     "https://drive.google.com/file/d/15WiaejmDrp1Ojmyy5lX9p3GyTG9guy3K/view?usp=drive_link",
            // ],
            tahun: "2012",
            added: "9 November 2025",
            playlist : [
                "MYLK",
                "CB",
            ],
        },
        {
            id: 1,
            judul: "1. Death Bed, powfu, beabadoobee",
            link: "https://www.youtube.com/watch?v=YefncL4TagU",
            // images: [
            //     // "/music/1.mp3",
            //     // "https://drive.google.com/file/d/1JBA0Nrp1Dr316eD_gmDLmA0okOMn_sUa/view?usp=drive_link",
            //     // "https://drive.google.com/file/d/1JBA0Nrp1Dr316eD_gmDLmA0okOMn_sUa/view?usp=sharing",
            //     // "https://drive.google.com/uc?export=download&id=1JBA0Nrp1Dr316eD_gmDLmA0okOMn_sUa",
            //     "https://drive.google.com/file/d/1JBA0Nrp1Dr316eD_gmDLmA0okOMn_sUa/view",
            // ],
            tahun: "2019?",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
            ],
        },
        {
            id: 2,
            judul: "2. Make You Mine, PUBLIC",
            link: "https://www.youtube.com/watch?v=kExE86VPJS0",
            // images: [
            //     // "/music/358.mp3",
            // ],
            tahun: "2014",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
            ],
        },
        {
            id: 3,
            judul: "3. Falling, Trevor Daniel",
            link: "https://www.youtube.com/watch?v=f2KmX0ZmGB0",
            tahun: "2020",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 4,
            judul: "4. Yummy, Justin Bieber",
            link: "https://www.youtube.com/watch?v=zD8dy-kj3qs",
            tahun: "3 Januari 2020",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 5,
            judul: "5. Someone You Loved, Lewis Capaldi",
            link: "https://www.youtube.com/watch?v=ywU6uYEmRfs",
            tahun: "8 November 2018",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
                "CB",
            ],
        },
        {
            id: 6,
            judul: "6. Memories, Maroon 5",
            link: "https://www.youtube.com/watch?v=Gqmo9jstTTU",
            tahun: "20 September 2019",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 7,
            judul: "7. Roxanne, Arizona Zervas",
            link: "https://www.youtube.com/watch?v=96RZInZAD6Y",
            tahun: "10 Oktober 2019",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 8,
            judul: "8. Nyaman, Andmesh",
            link: "https://www.youtube.com/watch?v=E_1SdECi8lg",
            tahun: "22 November 2019",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 9,
            judul: "9. Any Song, ZICO",
            link: "https://www.youtube.com/watch?v=Qd0NqTEz2Qk",
            tahun: "2020",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 10,
            judul: "10. It's You, Ali Gatie",
            link: "https://www.youtube.com/watch?v=a1obpxiMZHs",
            tahun: "2019?",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 11,
            judul: "11. Halu, Feby Putri",
            link: "https://www.youtube.com/watch?v=5qZJ6DJzcLE",
            tahun: "18 Agustus 2019",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 12,
            judul: "12. Waktu Yang Salah, Fiersa Besari",
            link: "https://www.youtube.com/watch?v=iyocjlk6z9E",
            tahun: "2014",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 13,
            judul: "13. Psycho , Red Velvet",
            link: "https://www.youtube.com/watch?v=EAYvJ3E0ysw",
            tahun: "23 Desember 2019",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 14,
            judul: "14. Tolong, Budi Doremi",
            link: "https://www.youtube.com/watch?v=UXmfPh5LjOY",
            tahun: "2018",
            added: "25 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 15,
            judul: "15. The Box, Roddy Ricch",
            link: "https://www.youtube.com/watch?v=2Ok95dyfwHI",
            tahun: "6 Desember 2019",
            added: "30 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 16,
            judul: "16. DIA DELÍCIA slowed version, Nakama, ΣP",
            link: "https://www.youtube.com/watch?v=nPafxUt-XUE",
            tahun: "2025",
            added: "30 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 17,
            judul: "17. COMETHRUE, JEREMY ZUCKER",
            link: "https://www.youtube.com/watch?v=jovxjsTkBeE",
            tahun: "28 September 2018",
            added: "30 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 18,
            judul: "18. Tonight You Belong to Me, Eddie Vedder",
            link: "https://www.youtube.com/watch?v=ytuxo3aZtD4",
            tahun: "2011",
            added: "30 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 19,
            judul: "19. Happy, Skinnyfabs",
            link: "https://www.youtube.com/watch?v=kYzibhSWknc",
            tahun: "5 Juli 2019",
            added: "30 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
        {
            id: 20,
            judul: "20. Bagaikan Langit, Potret",
            link: "https://www.youtube.com/watch?v=JTGUhj2qnhE",
            tahun: "1998",
            added: "30 Maret 2020",
            playlist : [
                "MYLK",
                "SED",
            ],
        },
    ];

    return NextResponse.json(data);
}