MUSIC_SOURCES = music/prejam-dontuse.mmpz

%.mp3: %.mmpz
	lmms render $^ -f mp3 -o $@

all: $(MUSIC_SOURCES:%.mmpz=%.mp3)
