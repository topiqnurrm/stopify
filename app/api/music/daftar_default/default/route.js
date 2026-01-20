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
        e : "Phonk",
        f : "Jawa",
        g : "DJ",
        h : "Love",
        i : "Rock",
        j : "Classic",

        7 : "Nyanyiable",
        8 : "Hearingable",
        k : "Else",

        b : "Taufiq",
        c : "Nadya",
        l : "Nadzar",

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
    
    // Jika hanya return mapping
    return NextResponse.json({ playlistMapping });
}