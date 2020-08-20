const SPOTIFY_CLIENT_ID = "aa601ee4dc62466397f8599de4944648";
const SPOTIFY_SECRET = "YWE2MDFlZTRkYzYyNDY2Mzk3Zjg1OTlkZTQ5NDQ2NDg6NzUyNjRmZGYzN2FjNDNiZGJiZjJkZTk0M2I3ZTM2Njc=";

const GRANT_TYPE = "client_credentials";
const MODIFY_PLAYLIST_SCOPE = ["playlist-modify-public", "playlist-modify-private"];

var ACCESS_TOKEN;
var MODIFY_TOKEN;

// RANDOM STRING: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
var STATE = 123;

function clientCredentialsFlow() {
    $.ajax({
        type: "POST",
        url: "https://accounts.spotify.com/api/token",
        data: {"grant_type": GRANT_TYPE},
        headers: {"Authorization": "Basic " + SPOTIFY_SECRET},
        success: function(response) {
            ACCESS_TOKEN = response.access_token;
            console.log("Access Token successfully retrieved:", ACCESS_TOKEN);
        },
        error: function() {
            alert("Could not connect to Spotify API");
        }
    });
}

function implicitGrantFlow() {

    var current_site = encodeURIComponent("http://localhost:5501/");
    var actual_site = encodeURIComponent("https://hayeselnut.github.io/deduplicatify/index.html");

    var redirect_url = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${current_site}&state=${STATE}&scope=${encodeURIComponent(MODIFY_PLAYLIST_SCOPE.join(" "))}`

    // Redirect them to redirect_url
    window.location.replace(redirect_url);

    // NOTHING HERE WILL GET RUN, ALL PROCESSES KILLED





    // They should get redirected back to same page (or should i do different page)

    // Then retrieve hash from # data area.
}

$(document).ready(function() {
    clientCredentialsFlow();

    if (location.hash) {
        var hash = location.hash.substring(1);
        MODIFY_TOKEN = hash.split("&")[0].split("=")[1];
        var state = hash.split("&")[3].split("=")[1]

        if (state != STATE) {
            alert("STATE IS NOT" + state + "=/=" + STATE);
        }

        // Do things with MODIFY_TOKEN
        // NOTE ALL MY DATA IS LOST :((
    }

});

function getPlaylistId(playlistLink) {
    // 2 cases

    if (playlistLink.includes("open.spotify.com/")) {
        // Playlist Link
        var split = playlistLink.split("/")
        return split[split.length - 1].split("?")[0];
    } else if (playlistLink.includes("spotify:playlist:")) {
        // Spotify URL
        return playlistLink.split(":")[2];
    }
}

function getSongDetails(song) {
    const artists = [];
    const artist_names = [];
    song.track.artists.forEach(function(artist) {
        artists.push(artist.id);
        artist_names.push(artist.name);
    });

    return {
        "id": song.track.id,
        "name": song.track.name,
        "artists": artists,
        "artist_names": artist_names,
        "duration_ms": song.track.duration_ms,
    };
}

function getSongs(playlist) {
    const songs = [];

    playlist.items.forEach(function(song) {
        if (song.track) {
            songs.push(getSongDetails(song));
        }
    })

    return songs;
}

function getTracks(url) {
    return $.ajax({
        type: "GET",
        url: url,
        headers: {"Authorization": "Bearer " + ACCESS_TOKEN},
    });
}

function getDuplicates(songs) {
    const duplicates = [];
    const seen = {};

    for (var i = 0; i < songs.length; i++) {
        if (i in seen) {
            continue;
        }

        const similars = [];

        for (var j = i + 1; j < songs.length; j++) {
            if (isSimilarSong(songs[i], songs[j])) {
                similars.push(j);
            }
        }

        // If found similars then print them
        if (similars.length) {
            similars.push(i);
            duplicates.push(similars);

            similars.forEach(function(idx) {
                seen[idx] = true;
            });
        }
    }

    return duplicates;
}

function showInvalidPlaylistLink() {
    // $("#remove-dupes-btn").css("display", "none");
    $("#playlist-metadata").fadeOut(500, function() {
        $("#sim-songs").css("padding-top", "100px").html('<h3 class="display-msg">Invalid Spotify playlist link 😒</h3>').fadeIn(500);
    });
}

function showPlaylist(playlistId) {
    return $.ajax({
        type: "GET",
        url: "https://api.spotify.com/v1/playlists/" + playlistId,
        headers: {"Authorization": "Bearer " + ACCESS_TOKEN},
        success: updatePlaylistMetadata,
        error: showInvalidPlaylistLink
    });
}

function showDuplicates(songs, duplicates) {
    duplicates.forEach(function(setOfDuplicates) {
        var songDetails = songs[setOfDuplicates[0]];
        var name = songDetails.name;
        var artists = songDetails.artist_names;

        for (var i = 1; i < setOfDuplicates.length; i++) {
            songDetails = songs[setOfDuplicates[i]];

            if (name.includes(songDetails.name) && !songDetails.name.includes(name)) {
                // New name is shorter than current name, and we want the shortest name
                name = songDetails.name;
            }

            artists = artists.filter(a => songDetails.artist_names.includes(a));
        }
        $("#sim-songs").append(`<p><strong>${name}</strong> by ${artists.join(", ")}</p>`);

        var appendSetOfDupes = '<div class="set-of-dupes flexbox">';
        setOfDuplicates.forEach(function(dupeId) {
            appendSetOfDupes += printSong(songs[dupeId]);
        });
        appendSetOfDupes += "</div>";
        $("#sim-songs").append(appendSetOfDupes);

        // THIS DOESNT WORK? IT DOES <DIV></DIV><IFRAME></IFRAME>
        // $("#sim-songs").append('<div class="set-of-dupes">');
        // setOfDuplicates.forEach(function(dupeId) {
        //     $("#sim-songs").append(printSong(songs[dupeId]));
        // });
        // $("#sim-songs").append("</div>");

    });
}

function updatePlaylistMetadata(playlist) {
    // p = playlist_object

    var duration = 500;

    $("#playlist-metadata").fadeOut(duration, function() {
        $("#playlist-name").html(playlist.name);
        $("#playlist-owner").html(playlist.owner.display_name);
        $("#playlist-desc").html(playlist.description);
        $("#playlist-length").html(playlist.tracks.total + " song");

        if (playlist.tracks.total > 1) {
            $("#playlist-length").append("s");
        }

        if (playlist.images.length) {
            $("#playlist-img").attr("src", playlist.images[0].url);
        } else {
            $("#playlist-img").attr("src", "assets/blank-playlist.jpg");
        }
    }).fadeIn(duration, function() {
        $("#sim-songs").css("padding-top", "0").fadeIn(duration);
    });
}

function isSimilarSong(song1, song2) {
    const buzzwords = ["mix", "acoustic", "live"];
    var s1 = song1.name.toLowerCase();
    var s2 = song2.name.toLowerCase();

    // Check song name is similar
    if (s1.length <= 2 || s2.length <= 2) {
        // Special case for small song names
        if (s1 != s2) {
            return false;
        }
    } else {
        if (!s1.includes(s2) && !s2.includes(s1)) {
            return false;
        }
    }

    // Check artist ids
    const intersection = song1.artists.filter(a => song2.artists.includes(a));
    if (!intersection.length) {
        return false;
    }

    // Check if songs are within 2.5 secs of each other
    if (Math.abs(song1.duration_ms - song2.duration_ms) > 2500) {
        return false;
    }

    // Check not a transformed version of original song
    for (var i = 0; i < buzzwords.length; i++) {
        var bw = buzzwords[i];

        if ( (s1.includes(bw) && !s2.includes(bw)) || (s2.includes(bw) && !s1.includes(bw)) ) {
            return false;
        }
    }

    // They are similar!
    console.log(Math.abs(song1.duration_ms - song2.duration_ms));
    return true;
}

function printSong(song) {
    // DEFAULT FOR COMPACT IS 300x80
    var width = 300;
    var height = 80;
    return `<iframe src="https://open.spotify.com/embed/track/${song.id}" width=${width} height=${height} frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
}

$("#dedup-txtbox").on("keydown", function(event) {
    if (event.which == 13) { // Enter key
        $("#dedup-btn").click();
    }
})

$("#dedup-btn").on("click", async function() {
    // $("#remove-dupes-btn").css("display", "none");
    $("#dedup-results").css("display", "block");
    $("#dedup-desc").slideUp(1000);
    $("#sim-songs").css("display", "none").html("Loading...");

    // Scroll into view
    $("#dedup-results")[0].scrollIntoView();

    var playlistLink = $("#dedup-txtbox").val();
    var playlistId = getPlaylistId(playlistLink);
    console.log("playlist id:", playlistId);

    showPlaylist(playlistId);

    // Get songs from playlist
    var p = await getTracks(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`);
    var songs = getSongs(p);

    while (p.next) {
        p = await getTracks(p.next);
        songs = songs.concat(getSongs(p));
    }

    console.log("all songs", songs);

    // Detect common songs
    duplicates = getDuplicates(songs);

    if (!duplicates.length) {
        // No duplicates found
        // $("#remove-dupes-btn").css("display", "none");
        $("#sim-songs").css("padding-top", "1000px").html('<h3 class="display-msg">No duplicates found! 😁</h3>');
    } else {
        // Duplicates found
        if (duplicates.length == 1) {
            $("#sim-songs").html(`<h2>${duplicates.length} set of duplicates were found:</h2>`);
        } else {
            $("#sim-songs").html(`<h2>${duplicates.length} sets of duplicates were found:</h2>`);
        }

        // Show duplicates
        showDuplicates(songs, duplicates);

        // $("#remove-dupes-btn").delay(1000).fadeIn(1000);
    }
});

// $("#remove-dupes-btn").on("click", async function() {
//     implicitGrantFlow();

//     // Remove duplicates

//     // If already have user token, try that

//     // If fails or don't have user token, request for authorisation
// })