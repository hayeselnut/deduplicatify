import requests
import config
import base64
import sys

def encode_base64(message):
    message_bytes = message.encode("ascii")
    base64_bytes = base64.b64encode(message_bytes)
    base64_message = base64_bytes.decode("ascii")

    return base64_message

SPOTIFY_CLIENT_ID = config.SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET = config.SPOTIFY_CLIENT_SECRET

GRANT_TYPE = "client_credentials"


def authorise():
    response = requests.post(f"https://accounts.spotify.com/api/token", data={"grant_type": GRANT_TYPE}, headers={"Authorization": "Basic " + encode_base64(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET)})

    if not response.ok:
        print(f"ERROR authorise(): status code {response.status_code}")
        exit(1)

    return response.json()

def get_playlist_tracks_object(access_token, url):
    response = requests.get(url, headers={"Authorization": "Bearer " + access_token})

    if not response.ok:
        print(f"ERROR get_playlist_track__object: status code {response.status_code}")
        print(response.json())
        exit(1)

    return response.json()

def extract_songs(access_token, url):
    playlist_tracks_object = get_playlist_tracks_object(access_token, url)

    songs = []
    for s in playlist_tracks_object["items"]:
        artists = []
        artist_names = []
        for a in s["track"]["artists"]:
            artists.append(a["id"])
            artist_names.append(a["name"])

        details = {
            "id": s["track"]["id"],
            "name": s["track"]["name"],
            "artists": artists,
            "artist_names": artist_names,
            "album": s["track"]["album"]["id"],
            "album_name": s["track"]["album"]["name"],
            "duration_ms": s["track"]["duration_ms"],
        }

        songs.append(details)

    more_songs = []
    if playlist_tracks_object["next"]:
        more_songs = extract_songs(access_token, playlist_tracks_object["next"])

    return songs + more_songs

def ms_to_mins(ms):
    secs = int(ms / 1000)
    mins = int(secs / 60)
    secs = secs % 60

    if secs < 10:
        secs = "0" + str(secs)

    return f"{mins}:{secs}"

def print_playlist(access_token, url):
    songs = extract_songs(access_token, url)

    for idx, s in enumerate(songs):
        print(f'{idx}: {s["id"]} {s["name"]}: {s["artist_names"]} -- from -- {s["album_name"]} --- {ms_to_mins(s["duration_ms"])}')

def show_exact_duplicates(access_token, url):
    # O(N)-ish

    print("\nFinding exact duplicates...")

    songs = extract_songs(access_token, url)
    seen = {}

    for s in songs:
        if s["id"] not in seen:
            seen[s["id"]] = 0
            continue

        if seen[s["id"]]:
            continue

        # FOUND DUPLICATE, LOOP THROUGH PLAYLIST AND SHOW ALL DUPLICATES
        print(f"\nExact duplicate found for {s['name']} by {s['artist_names']}")
        for i, song in enumerate(songs):
            if s["id"] == song["id"]:
                print(f'{i}: {song["name"]} by {song["artist_names"]} -- from -- {song["album_name"]}')
                seen[s["id"]] = 1

def intersection(list_1, list_2):
    return [x for x in list_1 if x in list_2]

def check_similar_song(song1, song2):
    buzzwords = ["remix", "acoustic", "live"]

    # Check song name is similar
    if song1["name"] not in song2["name"] and song2["name"] not in song1["name"]:
        # songs names are not similar
        return False

    # Check artist ids
    if not intersection(song1["artists"], song2["artists"]):
        # no common artists
        return False

    # Check time
    if abs(song1["duration_ms"] - song2["duration_ms"]) > 10000:
        # not within 10 sec threshold
        return False

    for bw in buzzwords:
        if bw in song1["name"].lower() and bw not in song2["name"] or bw in song2["name"].lower() and bw not in song1["name"]:
            # Remix version
            return False

    return True

def show_similar_duplicates(access_token, url):
    # O(N^2)-ish

    print("\nFinding similar duplicates...")

    songs = extract_songs(access_token, url)
    seen = {}

    for idx, s1 in enumerate(songs):
        if idx in seen:
            continue

        similars = []

        for i, s2 in enumerate(songs):
            if i <= idx:
                continue

            if check_similar_song(s1, s2):
                similars.append(i)

        # FOUND DUPLICATE, LOOP THROUGH PLAYLIST AND SHOW ALL DUPLICATES
        if similars:
            seen[idx] = True
            print(f"\nSimilar duplicates:")
            print(f"{idx}: {s1['name']} by {s1['artist_names']} -- from -- {s1['album_name']}")
            for i in similars:
                if i in seen:
                    print(f"ERROR ?? LOGIC ERROR?? {i} already in seen!! {songs[i]['name']} by {songs[i]['artist_names']} -- from -- {songs[i]['album_name']}")
                    exit(1)

                seen[i] = True

                print(f'{i}: {songs[i]["name"]} by {songs[i]["artist_names"]} -- from -- {songs[i]["album_name"]}')

    print ("\n", len(songs), "songs compared in this playlist\n")

################################################################################
#                                                                              #
#                                   MAIN                                       #
#                                                                              #
################################################################################


if len(sys.argv) != 2:
    print("USAGE: py deduplicatify.py <spotify url for playlist>")
    exit(1)

playlist_id = sys.argv[1].split(":")[2]

print(playlist_id)

# 1laBVRwIsV64Tdwel1J8oS
access_token = authorise()["access_token"]

url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"

print_playlist(access_token, url)

# Find exact duplicates
show_exact_duplicates(access_token, url)

# Find similar duplicates
show_similar_duplicates(access_token, url)