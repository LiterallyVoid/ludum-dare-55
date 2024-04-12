MUSIC_SOURCES = music/prejam-dontuse.mmpz
MUSIC_FILES = $(MUSIC_SOURCES:%.mmpz=%.mp3)

%.mp3: %.mmpz
	lmms render $^ -f mp3 -o $@


all: $(MUSIC_FILES)
