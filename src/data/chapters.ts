import { Chapter } from "@/types";

export const chapters: Chapter[] = [
  {
    id: "1",
    title: "Cellen",
    description: "Leer over de bouwstenen van het leven: cellen, celonderdelen en hun functies.",
    order: 1,
    icon: "🔬",
    paragraphs: [
      {
        id: "1-1",
        chapterId: "1",
        title: "Wat is een cel?",
        order: 1,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt uitleggen wat een cel is.",
          "Je kunt het verschil noemen tussen een dierlijke cel en een plantaardige cel.",
          "Je kunt de belangrijkste celonderdelen benoemen.",
        ],
        concepts: [
          { term: "Cel", definition: "De kleinste eenheid van leven." },
          { term: "Celkern", definition: "Het besturingscentrum van de cel, bevat het DNA." },
          { term: "Celmembraan", definition: "De buitenste laag van de cel die bepaalt wat er in en uit gaat." },
        ],
      },
      {
        id: "1-2",
        chapterId: "1",
        title: "Celonderdelen",
        order: 2,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt de functies van celonderdelen beschrijven.",
          "Je weet wat chloroplasten en mitochondriën doen.",
        ],
        concepts: [
          { term: "Mitochondriën", definition: "Celonderdelen die energie leveren voor de cel." },
          { term: "Chloroplasten", definition: "Celonderdelen in plantencellen waar fotosynthese plaatsvindt." },
        ],
      },
      {
        id: "1-3",
        chapterId: "1",
        title: "Van cel naar organisme",
        order: 3,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt de organisatieniveaus benoemen: cel, weefsel, orgaan, orgaanstelsel, organisme.",
        ],
        concepts: [
          { term: "Weefsel", definition: "Een groep cellen met dezelfde functie." },
          { term: "Orgaan", definition: "Een lichaamsdeel dat uit verschillende weefsels bestaat en een specifieke functie heeft." },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Voeding en vertering",
    description: "Ontdek hoe je lichaam voedsel verwerkt en welke voedingsstoffen je nodig hebt.",
    order: 2,
    icon: "🍎",
    paragraphs: [
      {
        id: "2-1",
        chapterId: "2",
        title: "Voedingsstoffen",
        order: 1,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt de zes groepen voedingsstoffen noemen.",
          "Je weet welke voedingsstoffen energie leveren.",
        ],
        concepts: [
          { term: "Koolhydraten", definition: "Voedingsstoffen die je lichaam snel energie geven." },
          { term: "Eiwitten", definition: "Voedingsstoffen die nodig zijn voor groei en herstel." },
        ],
      },
      {
        id: "2-2",
        chapterId: "2",
        title: "Het verteringsstelsel",
        order: 2,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt de organen van het verteringsstelsel benoemen.",
          "Je kunt uitleggen wat vertering is.",
        ],
        concepts: [
          { term: "Vertering", definition: "Het afbreken van voedsel tot kleine deeltjes die het bloed in kunnen." },
          { term: "Slokdarm", definition: "De buis die voedsel van je mond naar je maag brengt." },
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Planten",
    description: "Leer hoe planten groeien, voedsel maken en zich voortplanten.",
    order: 3,
    icon: "🌱",
    paragraphs: [
      {
        id: "3-1",
        chapterId: "3",
        title: "Fotosynthese",
        order: 1,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt uitleggen wat fotosynthese is.",
          "Je kunt de reactievergelijking van fotosynthese opschrijven.",
        ],
        concepts: [
          { term: "Fotosynthese", definition: "Het proces waarbij planten met licht, water en CO₂ glucose en zuurstof maken." },
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Ademhaling en bloedsomloop",
    description: "Ontdek hoe zuurstof door je lichaam wordt vervoerd en hoe je ademhaalt.",
    order: 4,
    icon: "❤️",
    paragraphs: [
      {
        id: "4-1",
        chapterId: "4",
        title: "De longen",
        order: 1,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt uitleggen hoe ademhaling werkt.",
          "Je kunt de onderdelen van de luchtwegen benoemen.",
        ],
        concepts: [
          { term: "Longblaasjes", definition: "Kleine blaasjes in de longen waar zuurstof het bloed in gaat." },
        ],
      },
    ],
  },
  {
    id: "5",
    title: "Zintuigen en zenuwstelsel",
    description: "Leer hoe je lichaam prikkels waarneemt en erop reageert.",
    order: 5,
    icon: "🧠",
    paragraphs: [
      {
        id: "5-1",
        chapterId: "5",
        title: "Zintuigen",
        order: 1,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt de vijf zintuigen benoemen.",
          "Je weet wat een prikkel en een impuls is.",
        ],
        concepts: [
          { term: "Prikkel", definition: "Iets dat je zintuig waarneemt, zoals licht, geluid of warmte." },
          { term: "Impuls", definition: "Een elektrisch signaal dat via zenuwen naar je hersenen gaat." },
        ],
      },
    ],
  },
  {
    id: "6",
    title: "Voortplanting",
    description: "Leer over de voortplanting van mensen en andere organismen.",
    order: 6,
    icon: "🧬",
    paragraphs: [
      {
        id: "6-1",
        chapterId: "6",
        title: "Puberteit",
        order: 1,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        learningGoals: [
          "Je kunt uitleggen wat puberteit is.",
          "Je kent de veranderingen die optreden tijdens de puberteit.",
        ],
        concepts: [
          { term: "Puberteit", definition: "De periode waarin je lichaam verandert van kind naar volwassene." },
          { term: "Hormonen", definition: "Stoffen in je bloed die lichaamsprocessen aansturen." },
        ],
      },
    ],
  },
];
