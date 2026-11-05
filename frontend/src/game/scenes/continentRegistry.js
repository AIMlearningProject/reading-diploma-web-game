import arcticImg from '../../assets/maps/arctic.jpg';
import europeImg from '../../assets/maps/europe.jpg';
import asiaImg from '../../assets/maps/asia.jpg';
import northamericaImg from '../../assets/maps/northamerica.jpg';
import southamericaImg from '../../assets/maps/southamerica.jpg';
import africaImg from '../../assets/maps/africa.jpg';
import oceaniaImg from '../../assets/maps/oceania.jpg';
import antarcticaImg from '../../assets/maps/antarctica.jpg';

const continentRegistry = [
    {
        key: 'ArcticMap',
        assetKey: 'arcticMap',
        assetPath: arcticImg,
        title: 'POHJOISNAVAN TUTKIMUSMATKA',
        rawPoints: [
            { x: 275, y: 300 }, { x: 370, y: 350 }, { x: 560, y: 215 },
            { x: 690, y: 195 }, { x: 880, y: 250 }, { x: 980, y: 350 },
            { x: 860, y: 420 }, { x: 600, y: 420 }, { x: 420, y: 430 },
            { x: 300, y: 530 }, { x: 560, y: 620 }
        ]
    },
    {
        key: 'EuropeMap',
        assetKey: 'europeMap',
        assetPath: europeImg,
        title: 'EUROOPAN SEIKKAILU',
        rawPoints: [
            { x: 411, y: 698 }, { x: 476, y: 659 }, { x: 529, y: 562 },
            { x: 621, y: 582 }, { x: 673, y: 650 }, { x: 778, y: 679 },
            { x: 844, y: 562 }, { x: 752, y: 485 }, { x: 621, y: 465 },
            { x: 686, y: 319 }, { x: 830, y: 251 }
        ]
    },
    {
        key: 'AsiaMap',
        assetKey: 'asiaMap',
        assetPath: asiaImg,
        title: 'AASIAN MATKA',
        rawPoints: [
            { x: 171, y: 407 }, { x: 241, y: 448 }, { x: 304, y: 432 },
            { x: 409, y: 506 }, { x: 465, y: 579 }, { x: 535, y: 514 },
            { x: 647, y: 522 }, { x: 731, y: 481 }, { x: 703, y: 342 },
            { x: 563, y: 317 }, { x: 423, y: 276 }
        ]
    },
    {
        key: 'NorthAmericaMap',
        assetKey: 'northAmericaMap',
        assetPath: northamericaImg,
        title: 'POHJOIS-AMERIKAN MATKA',
        rawPoints: [
            { x: 233, y: 257 }, { x: 387, y: 266 }, { x: 528, y: 284 },
            { x: 598, y: 338 }, { x: 478, y: 391 }, { x: 514, y: 463 },
            { x: 598, y: 481 }, { x: 696, y: 499 }, { x: 605, y: 552 },
            { x: 584, y: 633 }, { x: 668, y: 687 }
        ]
    },
    {
        key: 'SouthAmericaMap',
        assetKey: 'southAmericaMap',
        assetPath: southamericaImg,
        title: 'ETELÄ-AMERIKAN MATKA',
        rawPoints: [
            { x: 425, y: 208 }, { x: 600, y: 187 }, { x: 707, y: 208 },
            { x: 519, y: 248 }, { x: 640, y: 289 }, { x: 801, y: 279 },
            { x: 855, y: 370 }, { x: 653, y: 380 }, { x: 546, y: 461 },
            { x: 667, y: 522 }, { x: 506, y: 654 }
        ]
    },
    {
        key: 'AfricaMap',
        assetKey: 'africaMap',
        assetPath: africaImg,
        title: 'AFRIKAN SEIKKAILU',
        rawPoints: [
            { x: 351, y: 200 }, { x: 532, y: 209 }, { x: 640, y: 238 },
            { x: 820, y: 275 }, { x: 700, y: 313 }, { x: 532, y: 304 },
            { x: 363, y: 323 }, { x: 676, y: 417 }, { x: 808, y: 521 },
            { x: 700, y: 606 }, { x: 724, y: 719 }
        ]
    },
    {
        key: 'OceaniaMap',
        assetKey: 'oceaniaMap',
        assetPath: oceaniaImg,
        title: 'OSEANIAN MATKA',
        rawPoints: [
            { x: 605, y: 210 }, { x: 517, y: 252 }, { x: 479, y: 336 },
            { x: 341, y: 434 }, { x: 328, y: 545 }, { x: 454, y: 531 },
            { x: 580, y: 489 }, { x: 631, y: 601 }, { x: 694, y: 699 },
            { x: 895, y: 671 }, { x: 996, y: 678 }
        ]
    },
    {
        key: 'AntarcticaMap',
        assetKey: 'antarcticaMap',
        assetPath: antarcticaImg,
        title: 'ETELÄMANNER: SUURI JÄÄRETKI',
        rawPoints: [
            { x: 130, y: 470 }, { x: 250, y: 400 }, { x: 340, y: 410 },
            { x: 610, y: 230 }, { x: 800, y: 240 }, { x: 980, y: 280 },
            { x: 1040, y: 400 }, { x: 880, y: 420 }, { x: 690, y: 520 },
            { x: 560, y: 420 }, { x: 500, y: 610 }
        ]
    }
];

export default continentRegistry;
