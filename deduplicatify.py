import requests
import config
import base64

def encode_base64(message):
    message_bytes = message.encode("ascii")
    base64_bytes = base64.b64encode(message_bytes)
    base64_message = base64_bytes.decode("ascii")

    return base64_message

SPOTIFY_CLIENT_ID = config.SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET = config.SPOTIFY_CLIENT_SECRET

GRANT_TYPE = "client_credentials"

# POST https://accounts.spotify.com/api/token

def authorise():
    response = requests.post(f"https://accounts.spotify.com/api/token", data={"grant_type": GRANT_TYPE}, headers={"Authorization": "Basic " + encode_base64(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET)})

    if not response.ok:
        print(f"ERROR authorise(): status code {response.status_code}")
        exit(1)

    return response.json()

def read_playlist(access_token, playlist_id):
    response = requests.get(f"https://api.spotify.com/v1/playlists/{playlist_id}", headers={"Authorization": "Bearer " + access_token})

    if not response.ok:
        print(f"ERROR read_playlist: status code {response.status_code}")
        exit(1)

    return response.json()

def extract_songs(playlist_object):
    songs = []

    for s in playlist_object["tracks"]["items"]:
        # songs.append(s["track"]["id"])
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

    return songs

def ms_to_mins(ms):
    secs = int(ms / 1000)
    mins = int(secs / 60)
    secs = secs % 60

    if secs < 10:
        secs = "0" + str(secs)

    return f"{mins}:{secs}"

def print_playlist(playlist_object):
    songs = extract_songs(playlist_object)

    for s in songs:
        print(f'{s["id"]} {s["name"]}: {s["artist_names"]} -- from -- {s["album_name"]} --- {ms_to_mins(s["duration_ms"])}')

access_token = authorise()["access_token"]
playlist_object = read_playlist(access_token, "63UrKYun2JKrL4RQayoewt")

print_playlist(playlist_object)

# find exact duplicates

# find similar duplicates