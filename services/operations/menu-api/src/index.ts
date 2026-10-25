import { Hono } from 'hono';

const app = new Hono();

const menuItems = [
    { id: 'st_01', course: 'starters', name: 'Burrata with charred peaches', price: 12.5, station: 'garde-manger', dietary: ['vegetarian'], available: true, remaining: 24 },
    { id: 'st_02', course: 'starters', name: 'Crispy squid, lime and chili', price: 11, station: 'fry', dietary: ['gluten-free'], available: true, remaining: 30 },
    { id: 'st_03', course: 'starters', name: 'Smoked beetroot tartare', price: 10.5, station: 'garde-manger', dietary: ['vegan'], available: true, remaining: 16 },
    { id: 'mn_01', course: 'mains', name: 'Coal-roasted carrots', price: 18, station: 'grill', dietary: ['vegan'], available: true, remaining: 18 },
    { id: 'mn_02', course: 'mains', name: 'Dry-aged ribeye 300g', price: 46, station: 'grill', dietary: [], available: true, remaining: 7 },
    { id: 'mn_03', course: 'mains', name: 'Pan-seared sea bass', price: 32, station: 'saute', dietary: ['gluten-free'], available: true, remaining: 12 },
    { id: 'mn_04', course: 'mains', name: 'Wild mushroom risotto', price: 24, station: 'saute', dietary: ['vegetarian'], available: true, remaining: 14 },
    { id: 'ds_01', course: 'desserts', name: 'Lemon posset', price: 9, station: 'pastry', dietary: ['vegetarian', 'gluten-free'], available: false, remaining: 0 },
    { id: 'ds_02', course: 'desserts', name: 'Dark chocolate fondant', price: 10, station: 'pastry', dietary: ['vegetarian'], available: true, remaining: 9 },
    { id: 'dr_01', course: 'drinks', name: 'House lemonade', price: 4.5, station: 'bar', dietary: ['vegan'], available: true, remaining: 60 },
    { id: 'dr_02', course: 'drinks', name: 'Natural wine by the glass', price: 9, station: 'bar', dietary: [], available: true, remaining: 40 },
];

const floorTables = [
    { id: 'A1', status: 'seated', covers: 2, server: 'Mina', turnMinutes: 42 },
    { id: 'A2', status: 'reset', covers: 0, server: 'Mina', turnMinutes: 0 },
    { id: 'B7', status: 'hold', covers: 4, server: 'Jonah', turnMinutes: 12 },
    { id: 'B8', status: 'seated', covers: 3, server: 'Jonah', turnMinutes: 67 },
    { id: 'Rail', status: 'seated', covers: 5, server: 'Ari', turnMinutes: 28 },
    { id: 'PDR', status: 'hold', covers: 8, server: 'Nora', turnMinutes: 18 },
];

app.get('/health', (c) => c.json({ status: 'ok', service: 'menu-api', timestamp: new Date().toISOString() }));

app.get('/api/operations-management', (c) => c.json({
    data: {
        service: 'operations-management',
        generatedAt: new Date().toISOString(),
        floor: {
            tables: floorTables,
            totals: {
                seated: floorTables.filter((table) => table.status === 'seated').length,
                holds: floorTables.filter((table) => table.status === 'hold').length,
                covers: floorTables.reduce((sum, table) => sum + table.covers, 0),
            },
        },
        menu: {
            items: menuItems,
            unavailable: menuItems.filter((item) => !item.available),
        },
    },
}));

app.get('/api/v1/menu-items', (c) => c.json({ data: menuItems }));

// The menu grouped by course, in the order a guest reads it.
app.get('/api/v1/menu', (c) => {
    const courses = ['starters', 'mains', 'desserts', 'drinks'];
    return c.json({
        data: courses.map((course) => ({
            course,
            items: menuItems.filter((item) => item.course === course),
        })),
    });
});

app.get('/api/v1/eighty-six', (c) => c.json({ data: menuItems.filter((item) => !item.available) }));

export default {
    port: 4120,
    fetch: app.fetch,
};
