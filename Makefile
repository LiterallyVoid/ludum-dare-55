MUSIC_SOURCES = music/prejam-dontuse.mmpz
MUSIC_FILES = $(MUSIC_SOURCES:%.mmpz=%.mp3)

SOUND_SOURCES = sounds/shockwave.mmpz
SOUND_FILES = $(SOUND_SOURCES:%.mmpz=%.mp3)

LMMSFLAGS ?= -b 64 -l

%.mp3: %.mmpz
	lmms render $^ -f mp3 -o $@ $(LMMSFLAGS)

build: $(MUSIC_FILES) $(SOUND_FILES)

dist: build
	mkdir -p dist/

	cp index.html dist/
	cp style.css dist/
	cp src/ dist/ -r
	cp assets/ dist/ -r

	mkdir -p dist/music/
	cp $(MUSIC_FILES) dist/music/

	mkdir -p dist/sounds/
	cp $(SOUND_FILES) dist/sounds/

.PHONY: dist
