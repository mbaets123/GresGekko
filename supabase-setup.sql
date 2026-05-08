-- ============================================
-- Biologie Leeromgeving - Database Setup
-- ============================================

-- Tabellen aanmaken
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE paragraphs (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  video_url TEXT DEFAULT '',
  transcript TEXT DEFAULT '',
  infographic_url TEXT DEFAULT ''
);

CREATE TABLE learning_goals (
  id SERIAL PRIMARY KEY,
  paragraph_id TEXT NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

CREATE TABLE concepts (
  id SERIAL PRIMARY KEY,
  paragraph_id TEXT NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  paragraph_id TEXT NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'open', 'fill-in')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 4),
  question TEXT NOT NULL,
  options JSONB,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL
);

-- Row Level Security aanzetten (open read voor iedereen)
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read chapters" ON chapters FOR SELECT USING (true);
CREATE POLICY "Public read paragraphs" ON paragraphs FOR SELECT USING (true);
CREATE POLICY "Public read learning_goals" ON learning_goals FOR SELECT USING (true);
CREATE POLICY "Public read concepts" ON concepts FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);

-- ============================================
-- Data invoegen
-- ============================================

-- Hoofdstukken
INSERT INTO chapters (id, title, description, "order", icon) VALUES
  ('1', 'Cellen', 'Leer over de bouwstenen van het leven: cellen, celonderdelen en hun functies.', 1, '🔬'),
  ('2', 'Voeding en vertering', 'Ontdek hoe je lichaam voedsel verwerkt en welke voedingsstoffen je nodig hebt.', 2, '🍎'),
  ('3', 'Planten', 'Leer hoe planten groeien, voedsel maken en zich voortplanten.', 3, '🌱'),
  ('4', 'Ademhaling en bloedsomloop', 'Ontdek hoe zuurstof door je lichaam wordt vervoerd en hoe je ademhaalt.', 4, '❤️'),
  ('5', 'Zintuigen en zenuwstelsel', 'Leer hoe je lichaam prikkels waarneemt en erop reageert.', 5, '🧠'),
  ('6', 'Voortplanting', 'Leer over de voortplanting van mensen en andere organismen.', 6, '🧬');

-- Paragrafen
INSERT INTO paragraphs (id, chapter_id, title, "order") VALUES
  ('1-1', '1', 'Wat is een cel?', 1),
  ('1-2', '1', 'Celonderdelen', 2),
  ('1-3', '1', 'Van cel naar organisme', 3),
  ('2-1', '2', 'Voedingsstoffen', 1),
  ('2-2', '2', 'Het verteringsstelsel', 2),
  ('3-1', '3', 'Fotosynthese', 1),
  ('4-1', '4', 'De longen', 1),
  ('5-1', '5', 'Zintuigen', 1),
  ('6-1', '6', 'Puberteit', 1);

-- Leerdoelen
INSERT INTO learning_goals (paragraph_id, text, "order") VALUES
  ('1-1', 'Je kunt uitleggen wat een cel is.', 1),
  ('1-1', 'Je kunt het verschil noemen tussen een dierlijke cel en een plantaardige cel.', 2),
  ('1-1', 'Je kunt de belangrijkste celonderdelen benoemen.', 3),
  ('1-2', 'Je kunt de functies van celonderdelen beschrijven.', 1),
  ('1-2', 'Je weet wat chloroplasten en mitochondriën doen.', 2),
  ('1-3', 'Je kunt de organisatieniveaus benoemen: cel, weefsel, orgaan, orgaanstelsel, organisme.', 1),
  ('2-1', 'Je kunt de zes groepen voedingsstoffen noemen.', 1),
  ('2-1', 'Je weet welke voedingsstoffen energie leveren.', 2),
  ('2-2', 'Je kunt de organen van het verteringsstelsel benoemen.', 1),
  ('2-2', 'Je kunt uitleggen wat vertering is.', 2),
  ('3-1', 'Je kunt uitleggen wat fotosynthese is.', 1),
  ('3-1', 'Je kunt de reactievergelijking van fotosynthese opschrijven.', 2),
  ('4-1', 'Je kunt uitleggen hoe ademhaling werkt.', 1),
  ('4-1', 'Je kunt de onderdelen van de luchtwegen benoemen.', 2),
  ('5-1', 'Je kunt de vijf zintuigen benoemen.', 1),
  ('5-1', 'Je weet wat een prikkel en een impuls is.', 2),
  ('6-1', 'Je kunt uitleggen wat puberteit is.', 1),
  ('6-1', 'Je kent de veranderingen die optreden tijdens de puberteit.', 2);

-- Begrippen
INSERT INTO concepts (paragraph_id, term, definition, "order") VALUES
  ('1-1', 'Cel', 'De kleinste eenheid van leven.', 1),
  ('1-1', 'Celkern', 'Het besturingscentrum van de cel, bevat het DNA.', 2),
  ('1-1', 'Celmembraan', 'De buitenste laag van de cel die bepaalt wat er in en uit gaat.', 3),
  ('1-2', 'Mitochondriën', 'Celonderdelen die energie leveren voor de cel.', 1),
  ('1-2', 'Chloroplasten', 'Celonderdelen in plantencellen waar fotosynthese plaatsvindt.', 2),
  ('1-3', 'Weefsel', 'Een groep cellen met dezelfde functie.', 1),
  ('1-3', 'Orgaan', 'Een lichaamsdeel dat uit verschillende weefsels bestaat en een specifieke functie heeft.', 2),
  ('2-1', 'Koolhydraten', 'Voedingsstoffen die je lichaam snel energie geven.', 1),
  ('2-1', 'Eiwitten', 'Voedingsstoffen die nodig zijn voor groei en herstel.', 2),
  ('2-2', 'Vertering', 'Het afbreken van voedsel tot kleine deeltjes die het bloed in kunnen.', 1),
  ('2-2', 'Slokdarm', 'De buis die voedsel van je mond naar je maag brengt.', 2),
  ('3-1', 'Fotosynthese', 'Het proces waarbij planten met licht, water en CO₂ glucose en zuurstof maken.', 1),
  ('4-1', 'Longblaasjes', 'Kleine blaasjes in de longen waar zuurstof het bloed in gaat.', 1),
  ('5-1', 'Prikkel', 'Iets dat je zintuig waarneemt, zoals licht, geluid of warmte.', 1),
  ('5-1', 'Impuls', 'Een elektrisch signaal dat via zenuwen naar je hersenen gaat.', 2),
  ('6-1', 'Puberteit', 'De periode waarin je lichaam verandert van kind naar volwassene.', 1),
  ('6-1', 'Hormonen', 'Stoffen in je bloed die lichaamsprocessen aansturen.', 2);
