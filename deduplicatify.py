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
HEADERS = {"Authorization": "Basic " + encode_base64(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET)}

# POST https://accounts.spotify.com/api/token

def authorise():
    response = requests.post(f"https://accounts.spotify.com/api/token", data={"grant_type": GRANT_TYPE}, headers=HEADERS)

    if not response.ok:
        print(f"ERROR authorise(): status code {response.status_code}")
        exit(1)

    return response.json()

def read_playlist(playlist_id):
    response = requests.get(f"https://api.spotify.com/v1/playlists/{playlist_id}", headers=HEADERS)

    if not response.ok:
        print(f"ERROR read_playlist: status code {response.status_code}")
        exit(1)
    
    data = response.json()

    print(data)

access_token = authorise()["access_token"]

