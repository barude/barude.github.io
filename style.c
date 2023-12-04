ssbody {
    margin: 0;
    overflow: hidden;
}

.tv-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.tv-screen {
    width: 100vw;
    height: 56.25vw; /* 16:9 aspect ratio */
}

.tv-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('https://freight.cargo.site/t/original/i/7a17bb790f6bd14482482aba2de1e0d48bf291a698bc0c3b99049bcc1440e208/kodak_t_max_400_texture_by_drenton.jpg') repeat;
    mix-blend-mode: multiply;
    pointer-events: none;
}
