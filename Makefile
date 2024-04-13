MUSIC_SOURCES = music/prejam-dontuse.mmpz
MUSIC_FILES = $(MUSIC_SOURCES:%.mmpz=%.mp3)

%.mp3: %.mmpz
	lmms render $^ -f mp3 -o $@


all: $(MUSIC_FILES)

dist: $(MUSIC_FILES)
	mkdir -p dist/

	cp index.html dist/
	cp style.css dist/
	cp src/ dist/ -r
	cp assets/ dist/ -r

	mkdir -p dist/music/
	cp $(MUSIC_FILES) dist/music/

.PHONY: dist
