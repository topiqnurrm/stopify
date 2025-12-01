import { NextResponse } from 'next/server';

export async function GET() {
    // const type = {
    //     SED : "Sedih",
    //     NATI : "Nada Tinggi",
    // };

    const playlist = {
        1 : "Nada Tinggi",
        2 : "Nada Cepat",
        3 : "Nada Santai",

        4 : "Sedih",
        5 : "Bahagia",
        6 : "Adrenalin",
        a : "Normal",
        d : "Rap",

        7 : "Nyanyiable",
        8 : "Hearingable",

        b : "Taufiq",
        c : "Nadya",

        // --- Asia Tenggara, Timur, dan Selatan ---
        9 : "Indonesia", 10 : "Korea Selatan", 11 : "Jepang", 12 : "Barat (Kategori Umum)", 13 : "Tiongkok", 14 : "Filipina", 15 : "Vietnam", 16 : "Thailand", 17 : "Malaysia", 18 : "Singapura", 19 : "Myanmar", 20 : "Kamboja", 21 : "Laos", 22 : "Brunei", 23 : "Timor Leste", 24 : "Korea Utara", 25 : "India", 26 : "Pakistan", 27 : "Bangladesh", 28 : "Nepal", 29 : "Sri Lanka", 30 : "Maladewa", 31 : "Bhutan",
        
        // --- Asia Tengah dan Barat (Timur Tengah) ---
        32 : "Afganistan", 33 : "Kazakhstan", 34 : "Uzbekistan", 35 : "Turkmenistan", 36 : "Kirgistan", 37 : "Tajikistan", 38 : "Iran", 39 : "Irak", 40 : "Arab Saudi", 41 : "Uni Emirat Arab", 42 : "Qatar", 43 : "Bahrain", 44 : "Kuwait", 45 : "Oman", 46 : "Yaman", 47 : "Suriah", 48 : "Yordania", 49 : "Lebanon", 50 : "Israel", 51 : "Palestina (Negara pengamat PBB)", 52 : "Turki", 53 : "Siprus", 54 : "Georgia", 55 : "Armenia", 56 : "Azerbaijan",
        
        // --- Eropa Utara dan Barat ---
        57 : "Rusia", 58 : "Jerman", 59 : "Prancis", 60 : "Inggris Raya", 61 : "Italia", 62 : "Spanyol", 63 : "Belanda", 64 : "Belgia", 65 : "Luksemburg", 66 : "Swiss", 67 : "Austria", 68 : "Irlandia", 69 : "Portugal", 70 : "Norwegia", 71 : "Swedia", 72 : "Finlandia", 73 : "Islandia", 74 : "Denmark", 75 : "Estonia", 76 : "Latvia", 77 : "Lituania",

        // --- Eropa Selatan, Timur, dan Balkan ---
        78 : "Polandia", 79 : "Ceko", 80 : "Slowakia", 81 : "Hungaria", 82 : "Rumania", 83 : "Bulgaria", 84 : "Yunani", 85 : "Albania", 86 : "Kroasia", 87 : "Serbia", 88 : "Bosnia dan Herzegovina", 89 : "Montenegro", 90 : "Makedonia Utara", 91 : "Slovenia", 92 : "Malta", 93 : "San Marino", 94 : "Vatikan", 95 : "Monako", 96 : "Andorra", 97 : "Liechtenstein", 98 : "Moldova", 99 : "Ukraina", 100 : "Belarus",

        // --- Amerika Utara dan Tengah ---
        101 : "Amerika Serikat", 102 : "Kanada", 103 : "Meksiko", 104 : "Guatemala", 105 : "Honduras", 106 : "El Salvador", 107 : "Nikaragua", 108 : "Kosta Rika", 109 : "Panama", 110 : "Belize",

        // --- Karibia ---
        111 : "Kuba", 112 : "Haiti", 113 : "Republik Dominika", 114 : "Jamaika", 115 : "Trinidad dan Tobago", 116 : "Bahama", 117 : "Barbados", 118 : "Grenada", 119 : "Saint Vincent dan Grenadine", 120 : "Saint Lucia", 121 : "Saint Kitts dan Nevis", 122 : "Antigua dan Barbuda", 123 : "Dominika",

        // --- Amerika Selatan ---
        124 : "Brasil", 125 : "Argentina", 126 : "Kolombia", 127 : "Peru", 128 : "Cile", 129 : "Ekuador", 130 : "Venezuela", 131 : "Bolivia", 132 : "Paraguay", 133 : "Uruguay", 134 : "Guyana", 135 : "Suriname",

        // --- Afrika Utara ---
        136 : "Mesir", 137 : "Libya", 138 : "Tunisia", 139 : "Aljazair", 140 : "Maroko", 141 : "Sudan", 142 : "Sudan Selatan", 143 : "Mauritania",

        // --- Afrika Barat ---
        144 : "Nigeria", 145 : "Ghana", 146 : "Pantai Gading", 147 : "Senegal", 148 : "Mali", 149 : "Burkina Faso", 150 : "Niger", 151 : "Gambia", 152 : "Guinea", 153 : "Guinea-Bissau", 154 : "Sierra Leone", 155 : "Liberia", 156 : "Togo", 157 : "Benin", 158 : "Tanjung Verde",

        // --- Afrika Tengah ---
        159 : "Kamerun", 160 : "Republik Demokratik Kongo", 161 : "Republik Kongo", 162 : "Afrika Tengah", 163 : "Chad", 164 : "Gabon", 165 : "Guinea Khatulistiwa", 166 : "Sao Tome dan Principe",

        // --- Afrika Timur ---
        167 : "Etiopia", 168 : "Kenya", 169 : "Tanzania", 170 : "Uganda", 171 : "Rwanda", 172 : "Burundi", 173 : "Somalia", 174 : "Jibuti", 175 : "Eritrea", 176 : "Komoro", 177 : "Seychelles", 178 : "Madagaskar", 179 : "Mauritius", 180 : "Mozambik",

        // --- Afrika Selatan ---
        181 : "Afrika Selatan", 182 : "Zimbabwe", 183 : "Zambia", 184 : "Angola", 185 : "Namibia", 186 : "Botswana", 187 : "Lesotho", 188 : "Eswatini (Swaziland)", 189 : "Malawi",

        // --- Oseania dan Kepulauan Pasifik --- iki aku tuker nggo jawa dll
        191 : "Selandia Baru", 192 : "Papua Nugini", 193 : "Fiji", 194 : "Samoa", 195 : "Tonga", 196 : "Vanuatu", 197 : "Kepulauan Solomon", 198 : "Kiribati", 199 : "Tuvalu", 200 : "Palau", 201 : "Mikronesia", 202 : "Kepulauan Marshall", 203 : "Nauru",
            
        // Total 195 negara berdaulat (Nomor 51 dihitung sebagai negara pengamat PBB).
        // Penomoran berlanjut hingga 203 karena daftar PBB berisi 193 anggota + 2 pengamat (Vatikan, Palestina).
        // Penomoran di atas mencapai 203 entri.

        301 : "Jawa", 
    };

    const data = [
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
        {
            id: 30,
            judul: "Play Date, Melanie Martinez",
            link: "https://www.youtube.com/watch?v=HqKeWRPBOsI",
            tahun: "2015 Agustus 14",
            added: "20 Mei 2020",
            playlist : [
                "b",
                "2", "a", "8", "60",
            ],
        },
        {
            id: 29,
            judul: "LATHI, Weird Genius, Sara Fajira",
            link: "https://www.youtube.com/watch?v=DJSPhdOcj6M",
            tahun: "2020 Februari 28",
            added: "20 Mei 2020",
            playlist : [
                "b",
                "1", "6", "8", "9", "301",
            ],
        },
        {
            id: 28,
            judul: "Party Legends, Mobile Legends: Bang Bang",
            link: "https://www.youtube.com/watch?v=dmic4e4IdWA",
            tahun: "2020 April - Mei",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "2", "5", "8", "60",
            ],
        },
        {
            id: 27,
            judul: "Peradaban, .Feast",
            link: "https://www.youtube.com/watch?v=EOsUSdze0tk",
            tahun: "2018 Juli 13",
            added: "13 Mei 2020",
            playlist : [
                "b",
                "3", "6", "8", "9",
            ],
        },
        {
            id: 26,
            judul: "Bali, Rich Brian, Guapdad 4000",
            link: "https://www.youtube.com/watch?v=uOnjowaxnlI",
            tahun: "2020 April",
            added: "16 April 2020",
            playlist : [
                "b",
                "2", "d", "8", "60",
            ],
        },
        {
            id: 25,
            judul: "Toosie Slide, Drake",
            link: "https://www.youtube.com/watch?v=Sxbs03nuBRE",
            tahun: "2020 April 03",
            added: "16 April 2020",
            playlist : [
                "b",
                "2", "a", "8", "60",
            ],
        },
        {
            id: 24,
            judul: "Don’t Start Now, Dua Lipa",
            link: "https://www.youtube.com/watch?v=6G07RP-DnaE",
            tahun: "2019 Oktober 31",
            added: "15 April 2020",
            playlist : [
                "b",
                "2", "5", "7", "60",
            ],
        },
        {
            id: 23,
            judul: "Rumah Ke Rumah, Hindia",
            link: "https://www.youtube.com/watch?v=zX7atb-_kvQ",
            tahun: "2019 November 29",
            added: "10 April 2020",
            playlist : [
                "b",
                "3", "4", "8", "9",
            ],
        },
        {
            id: 22,
            judul: "Tatu, Happy Asmara",
            link: "https://www.youtube.com/watch?v=5rw5X7_98eU",
            tahun: "2020 Mei",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "2", "4", "8", "301", 
            ],
        },
        {
            id: 21,
            judul: "Lugu, Celine & Nadya",
            link: "https://www.youtube.com/watch?v=OluZLBnIpAg",
            tahun: "2018 Maret",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "2", "5", "8", "9",
            ],
        },
        {
            id: 20,
            judul: "Bagaikan Langit, Potret",
            link: "https://www.youtube.com/watch?v=JTGUhj2qnhE",
            tahun: "1998",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "2", "5", "8", "9",
            ],
        },
        {
            id: 19,
            judul: "Happy, Skinnyfabs",
            link: "https://www.youtube.com/watch?v=kYzibhSWknc",
            tahun: "2019 Juli 5",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "3", "4", "8", "60",
            ],
        },
        {
            id: 18,
            judul: "Tonight You Belong to Me, Eddie Vedder",
            link: "https://www.youtube.com/watch?v=ytuxo3aZtD4",
            tahun: "2011",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "3", "a", "8", "60",
            ],
        },
        {
            id: 17,
            judul: "COMETHRUE, JEREMY ZUCKER",
            link: "https://www.youtube.com/watch?v=jovxjsTkBeE",
            tahun: "2018 September 28",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "3", "a", "8", "60",
            ],
        },
        {
            id: 16,
            judul: "DIA DELÍCIA slowed version, Nakama, ΣP",
            link: "https://www.youtube.com/watch?v=nPafxUt-XUE",
            tahun: "2025",
            added: "30 November 2025",
            playlist : [
                "b",
                "2", "6", "8", "124",
            ],
        },
        {
            id: 15,
            judul: "The Box, Roddy Ricch",
            link: "https://www.youtube.com/watch?v=2Ok95dyfwHI",
            tahun: "2019 Desember 6",
            added: "30 Maret 2020",
            playlist : [
                "b",
                "2", "d", "8", "60",
            ],
        },
        {
            id: 14,
            judul: "Tolong, Budi Doremi",
            link: "https://www.youtube.com/watch?v=UXmfPh5LjOY",
            tahun: "2018",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "a", "7", "9",
            ],
        },
        {
            id: 13,
            judul: "Psycho , Red Velvet",
            link: "https://www.youtube.com/watch?v=EAYvJ3E0ysw",
            tahun: "2019 Desember 23",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "1", "5", "8", "10",
            ],
        },
        {
            id: 12,
            judul: "Waktu Yang Salah, Fiersa Besari",
            link: "https://www.youtube.com/watch?v=iyocjlk6z9E",
            tahun: "2014",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "4", "8", "9",
            ],
        },
        {
            id: 11,
            judul: "Halu, Feby Putri",
            link: "https://www.youtube.com/watch?v=5qZJ6DJzcLE",
            tahun: "2019 Agustus 18",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "4", "7", "9",
            ],
        },
        {
            id: 10,
            judul: "It's You, Ali Gatie",
            link: "https://www.youtube.com/watch?v=a1obpxiMZHs",
            tahun: "2019?",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "4", "8", "60",
            ],
        },
        {
            id: 9,
            judul: "Any Song, ZICO",
            link: "https://www.youtube.com/watch?v=Qd0NqTEz2Qk",
            tahun: "2020",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "2", "d", "8", "10",
            ],
        },
        {
            id: 8,
            judul: "Nyaman, Andmesh",
            link: "https://www.youtube.com/watch?v=E_1SdECi8lg",
            tahun: "2019 November 22",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "5", "7", "9",
            ],
        },
        {
            id: 7,
            judul: "Roxanne, Arizona Zervas",
            link: "https://www.youtube.com/watch?v=96RZInZAD6Y",
            tahun: "2019 Oktober 10",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "2", "a", "8", "60",
            ],
        },
        {
            id: 6,
            judul: "Memories, Maroon 5",
            link: "https://www.youtube.com/watch?v=Gqmo9jstTTU",
            tahun: "2019 September 20",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "a", "8", "60",
            ],
        },
        {
            id: 5,
            judul: "Someone You Loved, Lewis Capaldi",
            link: "https://www.youtube.com/watch?v=ywU6uYEmRfs",
            tahun: "2018 November 8",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "2", "4", "7", "60",
            ],
        },
        {
            id: 4,
            judul: "Yummy, Justin Bieber",
            link: "https://www.youtube.com/watch?v=zD8dy-kj3qs",
            tahun: "2020 Januari 3",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "2", "d", "7", "60",
            ],
        },
        {
            id: 3,
            judul: "Falling, Trevor Daniel",
            link: "https://www.youtube.com/watch?v=f2KmX0ZmGB0",
            tahun: "2020",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "2", "d", "7", "60",
            ],
        },
        {
            id: 2,
            judul: "Make You Mine, PUBLIC",
            link: "https://www.youtube.com/watch?v=kExE86VPJS0",
            // images: [
            //     // "/music/358.mp3",
            // ],
            tahun: "2014",
            added: "25 Maret 2020",
            playlist : [
                "b",
                "3", "a", "8", "60",
            ],
        },
        {
            id: 1,
            judul: "Death Bed, powfu, beabadoobee",
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
                "b",
                "2", "d", "8", "60",
            ],
        },
    ];

    return NextResponse.json(data);
}