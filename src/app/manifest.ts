import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FuteBolão',
        short_name: 'FuteBolão',
        description: 'Acompanhe jogos, dê palpites e participe de ligas.',
        start_url: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#16a34a',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
