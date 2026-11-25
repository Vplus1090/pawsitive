import React, { useMemo } from 'react';

const PALETTE = {
  '#': '#142211', // Crisp outline / pupils / nose
  'D': '#2c4217', // Soft shadow fur
  'M': '#557824', // Main warm olive fur
  'L': '#8ead3b', // Soft blush / inner ear / beak / wings
  'W': '#ecf7c6', // Cream highlight / chest / eye sparkle
};

// Cute Chibi 16-bit Pixel Art Sprites (32x28)
const SPRITES = {
  dog: [
    '................................',
    '................................',
    '.....####............####.......',
    '....#MMMM##..####..##MMMM#......',
    '...#MDMMMMM##WWWW##MMMMMDM#.....',
    '...#DDMMMMMMMWWWWMMMMMMMDD#.....',
    '...#DDMMMMMMMWWWWMMMMMMMDD#.....',
    '....#DMMMMMMMMWWMMMMMMMMD#......',
    '....#MMMM##MMMWWMMM##MMMM#......',
    '....#MMM#W##MMWWMM##W#MMM#......',
    '....#MMM####WWWWWW####MMM#......',
    '....#MLL#MMWWWWWWWWMM#LLM#......',
    '.....#MMMMWWW####WWWMMMM#.......',
    '......#MMWWWW####WWWWMM#........',
    '.......#WWWWWWLLWWWWWW#.........',
    '........#WWWW####WWWW#..........',
    '.......#DMMWWWWWWWWMMD#.........',
    '......#DMMMWWWWWWWWWWMMD#.......',
    '......#MMM#WWWWWWWWWW#MM#..###..',
    '......#MMM#WWWWWWWWWW#MM#.#WW#..',
    '......#DMM#WWWWWWWWWW#MD##MWW#..',
    '.......#MM#WW#WWWW#WW#M##DMM#...',
    '.......#DM#WW#WWWW#WW#D##DM#....',
    '........#M#WW#....#WW#M###......',
    '........#W#WW#....#WW#W#........',
    '........#W#WW#....#WW#W#........',
    '........######....######........',
    '................................',
  ],
  cat: [
    '................................',
    '................................',
    '.....###..............###.......',
    '....#MMM#............#MMM#......',
    '....#MLMM#..........#MMLM#......',
    '....#MLMMM##########MMMLM#......',
    '....#MMMMMMMMMMMMMMMMMMMM#......',
    '...#MMMMMMMMMMMMMMMMMMMMMM#.....',
    '...#MMMM##MMMMMMMMMM##MMMM#.....',
    '...#MMM#W##MMMMMMMM##W#MMM#.....',
    '...#MMM####MMMMMMMM####MMM#.....',
    '...#MLL#MMMMWW##WWMMMM#LLM#.....',
    '....#MMMMMMMWWLLWWMMMMMMM#......',
    '.....#DMMMMWWWWWWWWMMMMD#.......',
    '......##MMWWWWWWWWWWMM##........',
    '.......#DMMWWWWWWWWMMD#.........',
    '......#DMMWWWWWWWWWWMMD#..###...',
    '......#MMMWWWWWWWWWWMMM#.#WW#...',
    '......#MMM#WWWWWWWW#MMM#.#MWM#..',
    '.......#DM#WWWWWWWW#MD#..#DM#...',
    '.......#MM#WW#WW#WW#MM#..#M#....',
    '........#M#WW#WW#WW#M#..#DM#....',
    '........#M#WW#..#WW#M###MM#.....',
    '........#W#WW#..#WW#W####.......',
    '........#W#WW#..#WW#W#..........',
    '........######..######..........',
    '................................',
    '................................',
  ],
  cow: [
    '................................',
    '................................',
    '...###....................###...',
    '..#LLW#....##########....#WLL#..',
    '...#LL#..##WWWWWWWWWW##..#LL#...',
    '....####WWWWWWWWWWWWWWWW####....',
    '..###MM#WWWWWWWWWWWWWWWW#MM###..',
    '.#DMMMM#WWW##WWWWWW##WWW#MMMMD#.',
    '..#####WWWW#W#WWWW#W#WWWW#####..',
    '.......#WWW###WWWW###WWW#.......',
    '.......#WLLWWWWWWWWWWLLW#.......',
    '......#LLLLLLLLLLLLLLLLLL#......',
    '......#LLL##LLLLLLLL##LLL#......',
    '......#LLLLLL######LLLLLL#......',
    '.......##################.......',
    '.....###WWWWWW####WWWWWW###.....',
    '....#WWWWWWWW#LLLL#WWWWWWWW#....',
    '....#DWW###WWW####WWW###WWD#....',
    '....#DWW####WWWWWWWWWWWWWWWD#...',
    '....#DWW####WWWWWWWWWWWWWWWD#...',
    '.....#WWWWWWWWWWWWWW####WWW#....',
    '.....#WWWWWWWWWWWWWW####WW#.....',
    '......#WWW#WW#....#WW#WWW#......',
    '......#WWW#WW#....#WW#WWW#......',
    '......#DDD#DD#....#DD#DDD#......',
    '......####.##......##.####......',
    '................................',
    '................................',
  ],
  buffalo: [
    '................................',
    '................................',
    '..####....................####..',
    '.#LLLL#....##########....#LLLL#.',
    '.#DDLL#..##DDDDDDDDDD##..#LLDD#.',
    '..#####.#DDMMMMMMMMMMDD#.#####..',
    '...###.#DDMMMMMMMMMMMMDD#.###...',
    '..#DD#.#DM##MMMMMMMM##MD#.#DD#..',
    '...##..#DM#W#MMMMMM#W#MD#..##...',
    '.......#DM###MMMMMM###MD#.......',
    '.......#DLLMMMMMMMMMMLLD#.......',
    '......#DDDDDDDDDDDDDDDDDD#......',
    '......#DDD##DDDDDDDD##DDD#......',
    '......#DDDDDD######DDDDDD#......',
    '.......##################.......',
    '.....###DDDDDDDDDDDDDDDD###.....',
    '....#DDDDDDMMMMMMMMMMDDDDDD#....',
    '....#DDDDDMMMMMMMMMMMMDDDDD#....',
    '....#DDDDDMMMMMMMMMMMMDDDDD#....',
    '.....#DDDDMMMMMMMMMMMMDDDD#.....',
    '.....#DDDDDDDDDDDDDDDDDDDD#.....',
    '......#DDDD#DD#..#DD#DDDD#......',
    '......#DDDD#DD#..#DD#DDDD#......',
    '......#DDDD#DD#..#DD#DDDD#......',
    '......#####.##....##.#####......',
    '................................',
    '................................',
    '................................',
  ],
  bird: [
    '................................',
    '................................',
    '............########............',
    '..........##MMMMMMMM##..........',
    '.........#MMMMMMMMMMMM#.........',
    '........#MMMMMMMMMMMMMM#........',
    '.......#MMM##MMMMMMMMMMM#.......',
    '.....###MM#W##MMMMMMMMMM#.......',
    '...##LLL#M####MMMMMMMMMM#.......',
    '..#LLWWW#MLLMMMMMMMMMMMM#.......',
    '...##LLL##MMMMMMMMMMMMMM#.......',
    '.....#####DDDDDDDDDDDDDD#.......',
    '........#MMMWWWWWWWWWMMM#.......',
    '.......#MMMMWWWWWWWWWWMMM#......',
    '.......#MMMMWWLLLLLLWWMMM#......',
    '......#MMMMMWLLLLLLLLWMMMM#.....',
    '......#MMMMMWLLLLLLLLWMMMM#.....',
    '.......#MMMMWWLLLLLLWWMMMM##....',
    '.......#MMMMWWWWWWWWWWMMMM#D#...',
    '........#MMMMWWWWWWWWMMMM#DD#...',
    '.........#DMMMMMMMMMMMMD##DD#...',
    '..........##############..##....',
    '............#D#....#D#..........',
    '............#D#....#D#..........',
    '..........##L##....##L##........',
    '..........#####....#####........',
    '................................',
    '................................',
  ],
  owl: [
    '................................',
    '................................',
    '.....####............####.......',
    '....#MMMM############MMMM#......',
    '....#MMMMMMMMMMMMMMMMMMMM#......',
    '...#MMMMMWWWW####WWWWMMMMM#.....',
    '...#MMMWWW###WWWW###WWWMMM#.....',
    '...#MMMWW#W###WW###W#WWMMM#.....',
    '...#MMMWW#####LL#####WWMMM#.....',
    '...#MMMWWW###LLLL###WWWMMM#.....',
    '....#MMMWWWWW#LL#WWWWWM#M#......',
    '.....#DMMMMMMWWWWWWMMMMD#.......',
    '....#DMMMWWWWWWWWWWWWMMMD#......',
    '...#DMMMWWW#WW#WW#WWWWWMMD#.....',
    '...#DMMMWWWWW#WWWW#WWWWMMD#.....',
    '...#DMMMWWW#WWWW#WWWWWWMMD#.....',
    '....#MMMWWWWWWWWWWWWWWWMM#......',
    '....#DMMMWWWWWWWWWWWWWMMD#......',
    '.....#DDMMMMMMMMMMMMMMDDD#......',
    '......###DDDDDDDDDDDD###........',
    '........#LL#......#LL#..........',
    '.......#LL#LL#..#LL#LL#.........',
    '.......###.###..###.###.........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  duck: [
    '................................',
    '................................',
    '..........########..............',
    '........##MMMMMMMM##............',
    '.......#MMMMMMMMMMMM#...........',
    '......#MMMM##MMMMMMMM#..........',
    '...####MMM#W##MMMMMMM#..........',
    '..#LLLL#MM####MMMMMMM#..........',
    '.#LLWWWWMMLLMMMMMMMMM#..........',
    '..######MMMMMMMMMMMM#...........',
    '.......#DMMMMMMMMMMD#...........',
    '........#MWWWWWWWWM#............',
    '.......#MMWWWWWWWWMM#######.....',
    '......#MMMWWWWWWWWWMMMMMMMD#....',
    '.....#MMMMWWLLLLLLWWMMMMMMDD#...',
    '.....#MMMMWLLLLLLLLWMMMMMMM#....',
    '.....#MMMMWWLLLLLLWWMMMMMMD#....',
    '......#MMMMWWWWWWWWWWMMMMD#.....',
    '.......#DMMMMMMMMMMMMMMMD#......',
    '........#################.......',
    '..........#LL#....#LL#..........',
    '.........#LLL#....#LLL#.........',
    '.........#####....#####.........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  monkey: [
    '................................',
    '................................',
    '.........############...........',
    '.......##MMMMMMMMMMMM##.........',
    '....####MMMWWWWWWWWWMMM####.....',
    '...#DLL#MMWWWWWWWWWWWWMM#LLD#...',
    '..#DDMM#W###WWWWWWWW###W#MMDD#..',
    '..#DDMM#W#W#WWWWWWWW#W#W#MMDD#..',
    '...#DMM#W###WWWWWWWW###W#MMD#...',
    '....###WWLLWWWWWWWWWWLLWW###....',
    '.......#WWWWWW####WWWWWW#.......',
    '.......#WWWW########WWWW#.......',
    '........#WWWWWWWWWWWWWW#........',
    '.........##############.........',
    '.......#DMMMWWWWWWWWMMMD#.......',
    '......#DMMMMWWWWWWWWMMMMD#......',
    '......#DMMMMWWWWWWWWMMMMD#..##..',
    '.......#MMMMWWWWWWWWMMMM#..#MM#.',
    '.......#DMMMWWWWWWWWMMMD#..#MD#.',
    '........#MMMWWWWWWWWMMM#..#DM#..',
    '........#DMM#WWWWWW#MMD#.#DM#...',
    '.........#MM#......#MM###DM#....',
    '.........#MM#......#MM####......',
    '........#WW#........#WW#........',
    '........#WW#........#WW#........',
    '........####........####........',
    '................................',
    '................................',
  ],
  squirrel: [
    '................................',
    '................................',
    '...............######...........',
    '......##..##.##MMMMMM##.........',
    '.....#MM##MM#MMWWWWWWMM#........',
    '....#MLMMLMM#MMWWWWWWMMM#.......',
    '....#MMMMMMM#MMWWWWWWMMMD#......',
    '...#MMM##MMM#MMWWWWWWMMMD#......',
    '...#MM#W##MM#MMWWWWWWMMMD#......',
    '...#MM####MM#MMWWWWWWMMMD#......',
    '...#MLLMMMM##MMWWWWWWMMMD#......',
    '....#MMMMMM#.#MWWWWWMMMMD#......',
    '.....#######.#MWWWWWMMMM#.......',
    '.....#DMMWWWW#MMMMMMMMMD#.......',
    '....#DMMMWWWW#MMMMMMMMD#........',
    '....#DMMMWWWW#MMMMMMMD#.........',
    '...#LL#MMWWWW#MMMMMMD#..........',
    '..#LLLL#MWWWWWWWWWMD#...........',
    '..#DDDD#MWWWWWWWWMD#............',
    '...####.#DMMWWWWMD#.............',
    '.........#MMMMMMM#..............',
    '........#WW#...#WW#.............',
    '........#WW#...#WW#.............',
    '.......#####...#####............',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  rabbit: [
    '................................',
    '................................',
    '.......###............###.......',
    '......#WWW#..........#WWW#......',
    '......#WLW#..........#WLW#......',
    '......#WLW#..........#WLW#......',
    '......#WLW#..........#WLW#......',
    '......#WLW#..........#WLW#......',
    '......#WWW############WWW#......',
    '.....#WWWWWWWWWWWWWWWWWWWW#.....',
    '....#WWWWWWWWWWWWWWWWWWWWWW#....',
    '....#WWW##WWWWWWWWWWWW##WWW#....',
    '....#WW#W##WWWWWWWWWW##W#WW#....',
    '....#WW####WWWWLLWWWW####WW#....',
    '....#WWLLWWWWWW##WWWWWWLLWW#....',
    '.....#WWWWWWW######WWWWWWW#.....',
    '......##WWWWWWWWWWWWWWWW##......',
    '.....#WWWWWWWWWWWWWWWWWWWW#.....',
    '....#WWWWWWWWWWWWWWWWWWWWWW#....',
    '....#MWWWWWWWWWWWWWWWWWWWWM#.##.',
    '.....#MWWWWWWWWWWWWWWWWWWWM##WW#',
    '.....#MMWWWWWWWWWWWWWWWWWWMM#WW#',
    '......#MMWWWWWWWWWWWWWWWWMM#.##.',
    '.......#WWW#WWWWWWWWWW#WWW#.....',
    '.......#WWW#..........#WWW#.....',
    '......#WWWW#..........#WWWW#....',
    '......######..........######....',
    '................................',
  ],
  fox: [
    '................................',
    '................................',
    '.....###..............###.......',
    '....#MMM#............#MMM#......',
    '....#MLMM#..........#MMLM#......',
    '....#MLMMM##########MMMLM#......',
    '...#MMMMMMMMMMMMMMMMMMMMMM#.....',
    '..#MMMMMMMMMMMMMMMMMMMMMMMM#....',
    '..#MMMM##MMMMMMMMMMMM##MMMM#....',
    '..#MMM#W##MMMMMMMMMM##W#MMM#....',
    '..#MMM####WWWWWWWWWW####MMM#....',
    '...#MMWWWWWWWW##WWWWWWWWMM#.....',
    '....#WWWWWWWW####WWWWWWWW#......',
    '.....#WWWWWWWWWWWWWWWWWW#.......',
    '......#MMMMMMMMMMMMMMMM#........',
    '.....#MMMWWWWWWWWWWWWMMM#..###..',
    '....#MMMWWWWWWWWWWWWWWMMM##WWW#.',
    '....#MMM#WWWWWWWWWWWW#MMM#MWWW#.',
    '.....#DM#WWWWWWWWWWWW#MD##MMMW#.',
    '......#M#WW#WWWWWW#WW#M##DMMM#..',
    '......#M#WW#WWWWWW#WW#M##MMM#...',
    '.......#DWW#......#WW#D####.....',
    '.......#DDD#......#DDD#.........',
    '.......#####......#####.........',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  bat: [
    '................................',
    '................................',
    '..........###....###............',
    '.........#MMM####MMM#...........',
    '.........#MLMMMMMMLM#...........',
    '..####...#MMMMMMMMMM#...####....',
    '.#MMMM###MMMM#WW#MMMM###MMMM#...',
    '.#MMMMMMMMMMM####MMMMMMMMMMM#...',
    '#MMMMM###MMWWWWWWWWMM###MMMMM#..',
    '#MMMM#DMMMMWWWWWWWWMMMMD#MMMM#..',
    '#MMM#DD#MMMMWWWWWWMMMM#DD#MMM#..',
    '#MM#DDDD#MMMMMMMMMMMM#DDDD#MM#..',
    '.##DDDDD##MMMMMMMMMM##DDDDD##...',
    '...#####..#DMMMMMMD#..#####.....',
    '..........#DDMMMMDD#............',
    '...........#DDDDDD#.............',
    '...........#W#..#W#.............',
    '...........###..###.............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  butterfly: [
    '................................',
    '................................',
    '...........##......##...........',
    '..........#..........#..........',
    '....######.#........#.######....',
    '...#LLLLLL#.#......#.#LLLLLL#...',
    '..#LLWWWWLL#.##..##.#LLWWWWLL#..',
    '..#LWW##WWL##MMMMMM##LWW##WWL#..',
    '..#LLWWWWLL#MMMMMMMM#LLWWWWLL#..',
    '...#LLLLLLL#MMM##MMM#LLLLLLL#...',
    '....#LLLLLL#MMMMMMMM#LLLLLL#....',
    '.....#MMMMM#MMWWWWMM#MMMMM#.....',
    '....#LLLLLL#MMMMMMMM#LLLLLL#....',
    '...#LLWWWWL#MMWWWWMM#LWWWWLL#...',
    '...#LWW##WW#MMMMMMMM#WW##WWL#...',
    '...#LLWWWWL#DMMMMMMD#LWWWWLL#...',
    '....#LLLLLL##DDDDDD##LLLLLL#....',
    '.....#######..####..#######.....',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  bee: [
    '................................',
    '................................',
    '..........#####..#####..........',
    '.........#WWWWW##WWWWW#.........',
    '.........#WWWWWWWWWWWW#.........',
    '..........#WWWW##WWWW#..........',
    '...........##########...........',
    '.......##################.......',
    '......#LLLLLL##LLLLLL##DD#......',
    '.....#LLWWWWL##WWWWWW##DDD#.....',
    '....#LLL####LLLL####LL##DDD#....',
    '....#LL##W#LLLLLL#W##LL#DDD#....',
    '....#LLL###LLLLLL###LLL##DDD#...',
    '.....#LLLLLLLLLLLLLLLLL##DD#....',
    '......#LL###LLLLLL###LL#DD#.....',
    '.......################.##......',
    '.........#D#..#D#..#D#..........',
    '.........###..###..###..........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  ladybug: [
    '................................',
    '................................',
    '..........#..........#..........',
    '...........#..####..#...........',
    '...........##DDDDDD##...........',
    '..........#DDDDDDDDDD#..........',
    '.........#DD#W#DD#W#DD#.........',
    '........#####DDDDDD#####........',
    '.......#LLLLLL#DD#LLLLLL#.......',
    '......#LLL##LL#DD#LL##LLL#......',
    '......#LLL##LL#DD#LL##LLL#......',
    '.....#LLLLLLLL#DD#LLLLLLLL#.....',
    '.....#LL##LLLL#DD#LLLL##LL#.....',
    '.....#LL##LLLL#DD#LLLL##LL#.....',
    '......#LLLLLLL#DD#LLLLLLL#......',
    '......#LLLL##L#DD#L##LLLL#......',
    '.......#LLL##L#DD#L##LLL#.......',
    '........#DDDDD####DDDDD#........',
    '.........##############.........',
    '........#D#...#D#....#D#........',
    '........###...###....###........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  beetle: [
    '................................',
    '................................',
    '.........##..........##.........',
    '........#MM#........#MM#........',
    '.........#MM#......#MM#.........',
    '..........#MM######MM#..........',
    '.........#DDDDDDDDDDDD#.........',
    '........#DD#W#DDDD#W#DD#........',
    '.......#################........',
    '......#MMMMMMMM#MMMMMMMM#.......',
    '.....#MMMWWWMMM#MMMWWWMMM#......',
    '.....#MMMMMMMMM#MMMMMMMMM#......',
    '....#DMMMMMMMMM#MMMMMMMMMD#.....',
    '....#DMMMMMMMMM#MMMMMMMMMD#.....',
    '.....#MMMMMMMMM#MMMMMMMMM#......',
    '.....#DMMMMMMMM#MMMMMMMMD#......',
    '......#DDDDDDDD#DDDDDDDD#.......',
    '.......#################........',
    '......#D#.....#D#.....#D#.......',
    '......###.....###.....###.......',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  lizard: [
    '................................',
    '................................',
    '........########................',
    '......##LLLLLLLL##..............',
    '.....#LLLLWWWWLLLL#.............',
    '....#LL##LLLLLL##LL#............',
    '....#L#W#LLLLLL#W#L#............',
    '....#L###LLLLLL###L#............',
    '.....#LLLLLLLLLLLL#.............',
    '......##MMMMMMMM##..............',
    '.......#MMWWWWMM#...............',
    '.....###MMWWWWMM###.............',
    '....#LL#MMWWWWMM#LL#............',
    '....###.MMMMMMMM.###............',
    '........#MMWWWWMM#..............',
    '.......#MMMWWWWMMM#.............',
    '.....###MMWWWWMM###.............',
    '....#LL#MMWWWWMM#LL#............',
    '....###.#DMMMMD#.###............',
    '.........#MMMM#......####.......',
    '..........#MMM#....##MMMM#......',
    '...........#MMM####MMMMD#.......',
    '............#MMMMMMMMDD#........',
    '.............#########..........',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  turtle: [
    '................................',
    '................................',
    '...........##########...........',
    '.........##MMMMMMMMMM##.........',
    '........#MMMWWMMMMWWMMM#........',
    '.......#MMMWWWWMMWWWWMMM#.......',
    '.......#MMMWW##MM##WWMMM#.......',
    '..####.#MMMMMMMMMMMMMMMM#.......',
    '.#LLLL##DDMMMMMMMMMMMMDD#.......',
    '#LL#W##L#MMMMMMMMMMMMMMMM#......',
    '#LLLLLLL#DDDDDDDDDDDDDDDD#......',
    '.#LLLLLL##################......',
    '..#####LLLLLLLLLLLLLLLLLL#......',
    '......#LLLL#LLLLLLLL#LLLL#......',
    '......#DDDD#........#DDDD#......',
    '......#####..........#####......',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  snake: [
    '................................',
    '................................',
    '..........########..............',
    '........##MMMMMMMM##............',
    '.......#MMMMMMMMMMMM#...........',
    '......#MM##MMMMMM##MM#..........',
    '......#M#W#MMMMMM#W#M#..........',
    '......#M###MMMMMM###M#..........',
    '.......#MMMMWWWWMMMM#...........',
    '........#####WW#####............',
    '............#WW#................',
    '............#..#................',
    '.........#########..............',
    '.......##MMMWWWWMM##............',
    '......#MMMMWWWWWWMMM#...........',
    '......#MMM#WWWWWW#MMM#..........',
    '.......#MM########MMM#..........',
    '......#MMMMWWWWWWWWMMM#.........',
    '.....#MMMMWWWWWWWWWWMMM#........',
    '.....#MM##WWWWWWWWWW##MM#.......',
    '......##..###########..#........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  frog: [
    '................................',
    '................................',
    '......#####........#####........',
    '.....#MMMMM#......#MMMMM#.......',
    '....#MM###MM######MM###MM#......',
    '....#M#W##MMLLLLLLMM##W#M#......',
    '....#MM###MMLLLLLLMM###MM#......',
    '....#LLLLLLLLLLLLLLLLLLLL#......',
    '...#LLLMMLLLLLLLLLLLLMMLLL#.....',
    '...#LLLLLLLL######LLLLLLLL#.....',
    '....#LLLLWWWWWWWWWWWWLLLL#......',
    '....#LLWWWWWWWWWWWWWWWWLL#......',
    '...#LL#WWWWWWWWWWWWWWWW#LL#.....',
    '...#L##WWWWWWWWWWWWWWWW##L#.....',
    '..#LL#WWWWWWWWWWWWWWWWWW#LL#....',
    '..#LL#WW#WWWWWWWWWWWW#WW#LL#....',
    '..####WW#WWWWWWWWWWWW#WW####....',
    '.....#WW#............#WW#.......',
    '....#LLW#............#WLL#......',
    '....#####............#####......',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  question: [
    '................................',
    '................................',
    '...........##########...........',
    '.........##MMMMMMMMMM##.........',
    '........#MMMWWWWWWWMMMM#........',
    '.......#MMMWWMMMMMMWWMMM#.......',
    '.......#MMWW#......#WWMM#.......',
    '.......#MMW#........#WMM#.......',
    '.......#DDD#........#WMM#.......',
    '........###........#WWMM#.......',
    '..................#WWMM#........',
    '.................#WWMM#.........',
    '................#WWMM#..........',
    '...............#WWMM#...........',
    '..............#WWMM#............',
    '..............#WMMM#............',
    '..............#DDDM#............',
    '...............####.............',
    '................................',
    '..............######............',
    '.............#MMWWMM#...........',
    '.............#MMMMMM#...........',
    '.............#DDDDDD#...........',
    '..............######............',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
};

function resolveSpriteKey(species = 'Dog') {
  const s = species.toLowerCase();
  if (SPRITES[s]) return s;

  // Insects
  if (s.includes('butterfly') || s.includes('moth')) return 'butterfly';
  if (s.includes('bee') || s.includes('wasp')) return 'bee';
  if (s.includes('ladybug')) return 'ladybug';
  if (s.includes('dragonfly') || s.includes('damselfly') || s.includes('fly') || s.includes('strider') || s.includes('lacewing')) return 'butterfly';
  if (s.includes('beetle') || s.includes('mantis') || s.includes('grasshopper') || s.includes('locust') || s.includes('cricket') || s.includes('ant') || s.includes('cicada') || s.includes('bug') || s.includes('firefly') || s.includes('stick')) return 'beetle';

  // Reptiles & Amphibians
  if (s.includes('turtle') || s.includes('tortoise') || s.includes('slider')) return 'turtle';
  if (s.includes('snake') || s.includes('cobra') || s.includes('python') || s.includes('keelback') || s.includes('worm')) return 'snake';
  if (s.includes('frog') || s.includes('toad')) return 'frog';
  if (s.includes('gecko') || s.includes('lizard') || s.includes('iguana') || s.includes('chameleon') || s.includes('skink') || s.includes('dragon') || s.includes('anole') || s.includes('crocodile') || s.includes('salamander') || s.includes('newt') || s.includes('axolotl')) return 'lizard';
  if (s.includes('snail') || s.includes('spider')) return 'beetle';

  // Birds
  if (s.includes('owl')) return 'owl';
  if (s.includes('duck') || s.includes('swan') || s.includes('egret') || s.includes('heron')) return 'duck';
  if (s.includes('bird') || s.includes('pigeon') || s.includes('sparrow') || s.includes('crow') || s.includes('myna') || s.includes('parakeet') || s.includes('peafowl') || s.includes('koel') || s.includes('kingfisher') || s.includes('kite') || s.includes('shikra') || s.includes('dove') || s.includes('bulbul') || s.includes('sunbird') || s.includes('weaver') || s.includes('woodpecker') || s.includes('chicken') || s.includes('rooster') || s.includes('robin') || s.includes('lapwing') || s.includes('drongo') || s.includes('budgerigar') || s.includes('cockatiel')) return 'bird';

  // Mammals
  if (s.includes('fox') || s.includes('jackal')) return 'fox';
  if (s.includes('bat')) return 'bat';
  if (s.includes('cat')) return 'cat';
  if (s.includes('cow') || s.includes('goat') || s.includes('sheep') || s.includes('deer') || s.includes('nilgai') || s.includes('horse') || s.includes('pony') || s.includes('donkey') || s.includes('mule') || s.includes('pig') || s.includes('boar')) return 'cow';
  if (s.includes('buffalo')) return 'buffalo';
  if (s.includes('monkey') || s.includes('langur')) return 'monkey';
  if (s.includes('squirrel') || s.includes('chipmunk') || s.includes('mouse') || s.includes('rat') || s.includes('hamster') || s.includes('guinea') || s.includes('gerbil') || s.includes('chinchilla') || s.includes('hedgehog') || s.includes('porcupine') || s.includes('mongoose') || s.includes('ferret') || s.includes('civet') || s.includes('otter')) return 'squirrel';
  if (s.includes('rabbit')) return 'rabbit';

  return 'dog';
}

function compileGridToRects(grid, silhouette) {
  const rects = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || !PALETTE[ch]) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) {
        w++;
      }
      const fill = silhouette ? '#142211' : PALETTE[ch];
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={fill} />);
      x += w;
    }
  });
  return rects;
}

export function PixelAnimalSprite({ species = 'Dog', className = 'w-20 h-20', silhouette = false }) {
  const key = resolveSpriteKey(species);
  const grid = SPRITES[key] || SPRITES.dog;

  const rects = useMemo(() => compileGridToRects(grid, silhouette), [grid, silhouette]);

  return (
    <svg
      viewBox="0 0 32 28"
      shapeRendering="crispEdges"
      className={className}
      aria-label={species}
    >
      {rects}
    </svg>
  );
}

export function PixelQuestionMark({ className = 'w-20 h-20' }) {
  const rects = useMemo(() => compileGridToRects(SPRITES.question, false), []);

  return (
    <svg
      viewBox="0 0 32 28"
      shapeRendering="crispEdges"
      className={className}
      aria-label="Unknown animal"
    >
      {rects}
    </svg>
  );
}

export function PixelHabitatBg({ className = '' }) {
  return (
    <svg
      viewBox="0 0 160 96"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="160" height="34" fill="#e3f4ae" />
      <rect x="0" y="34" width="160" height="24" fill="#d7ee96" />

      <rect x="18" y="12" width="18" height="4" fill="#eff9d2" />
      <rect x="22" y="9" width="10" height="3" fill="#eff9d2" />
      <rect x="14" y="14" width="24" height="2" fill="#eff9d2" />

      <rect x="78" y="18" width="22" height="4" fill="#eff9d2" />
      <rect x="83" y="15" width="12" height="3" fill="#eff9d2" />
      <rect x="74" y="20" width="28" height="2" fill="#eff9d2" />

      <rect x="128" y="10" width="14" height="3" fill="#eff9d2" />
      <rect x="131" y="8" width="8" height="2" fill="#eff9d2" />

      <rect x="0" y="52" width="160" height="12" fill="#cce687" />
      <rect x="10" y="48" width="32" height="4" fill="#cce687" />
      <rect x="16" y="45" width="18" height="3" fill="#cce687" />
      <rect x="92" y="47" width="44" height="5" fill="#cce687" />
      <rect x="104" y="44" width="20" height="3" fill="#cce687" />

      <rect x="0" y="62" width="160" height="2" fill="#b4d368" />
      <rect x="0" y="64" width="160" height="32" fill="#c1de79" />

      <rect x="14" y="68" width="4" height="2" fill="#add05c" />
      <rect x="16" y="66" width="2" height="2" fill="#add05c" />
      <rect x="52" y="72" width="6" height="2" fill="#add05c" />
      <rect x="86" y="67" width="4" height="2" fill="#add05c" />
      <rect x="116" y="70" width="8" height="2" fill="#add05c" />
      <rect x="118" y="68" width="2" height="2" fill="#add05c" />
      <rect x="140" y="66" width="4" height="2" fill="#add05c" />
      <rect x="34" y="78" width="5" height="2" fill="#add05c" />
      <rect x="72" y="80" width="4" height="2" fill="#add05c" />
      <rect x="102" y="84" width="6" height="2" fill="#add05c" />

      <rect x="64" y="70" width="2" height="2" fill="#d7ee96" />
      <rect x="130" y="74" width="2" height="2" fill="#d7ee96" />
      <rect x="24" y="82" width="3" height="2" fill="#d7ee96" />
    </svg>
  );
}
