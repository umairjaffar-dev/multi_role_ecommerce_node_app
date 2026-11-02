# Surveillance lab

A local video pipeline for learning: fake IP cameras → MediaMTX → browser.
The Node backend manages cameras and tells MediaMTX which streams to pull.

## Run

```bash
npm run services:up      # from the repo root: storage + MediaMTX + fake cameras
npm run services:ps      # status
npm run services:down    # stop everything
```

Requires `surveillance/.env` (see `.env.example`). `MEDIAMTX_API_PASSWORD` must match the root `.env`.

## Fake cameras

| Container | MediaMTX path | Video file |
| --------- | ------------- | ---------- |
| fake-cam1 | `fake1` | `media/sample_720p.mp4` |
| fake-cam2 | `fake2` | `media/trafic_720p.mp4` |
| fake-cam3 | `fake3` | `media/zabra-cross_720p.mp4` |

In the app, add a camera with RTSP URL `rtsp://localhost:8554/fake1` (or `fake2`, `fake3`).
`localhost` is correct: MediaMTX reads this URL, and for MediaMTX localhost is itself.

## Preparing a video

Videos are not committed (`media/` is git-ignored). Convert any source video once:

```bash
ffmpeg -y -i input.mp4 -vf scale=1280:-2 -r 15 \
  -c:v libx264 -preset veryfast -g 30 -keyint_min 30 -sc_threshold 0 -bf 0 \
  -pix_fmt yuv420p -an output_720p.mp4
```

Why these settings: the fake cameras stream with `-c:v copy`, so the file reaches the browser as is.

- `-g 30 -keyint_min 30 -sc_threshold 0`: a keyframe exactly every 2 s. HLS segments must start on a keyframe; long gaps freeze the picture.
- `-bf 0`: no B-frames, friendlier to live streaming and WebRTC.
- `-r 15`, 720p: typical CCTV sub-stream; stream copy keeps CPU near zero.

## Adding a fake camera

1. Convert a video into `media/`.
2. `docker-compose.yml`: copy a `fake-camN` service, change the file and the path (`fakeN`).
3. `mediamtx.yml`: add `fakeN: { source: publisher }` under `paths`.
4. Root `.env` and `.env.example`: add `fakeN` to `MEDIAMTX_RESERVED_PATHS`, then restart the backend.
   Without this, the backend reconcile job deletes `fakeN` as an orphan path.
5. `docker compose up -d` and `docker compose restart mediamtx`.

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| Tile shows "Camera unreachable" | Wrong RTSP URL, or the fake camera is not publishing (`docker compose logs fake-camN`) |
| Fake camera path disappears after ~30 s | Path missing from `MEDIAMTX_RESERVED_PATHS`, or backend not restarted |
| Picture frozen while the time runs | Video without regular keyframes; re-convert with the command above |
| Playback stutters more over time | Browser DevTools Network tab recording LL-HLS requests; close it for performance tests |