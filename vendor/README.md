# Three.js runtime

The prototype loads the pinned Three.js ES module from cdnjs at runtime and automatically switches to the built-in Canvas renderer when WebGL or the network is unavailable. This keeps the repository lightweight while preserving a playable offline-safe presentation mode.
