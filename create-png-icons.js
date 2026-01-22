import fs from 'fs';
import path from 'path';

// Pre-generated PNG icons as base64 (simple purple circle timer icons)
// These are minimal valid PNG files

const icons = {
  16: `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA4ElEQVR42mNgGAWDBDAyMjL8BwGgIL7i/0CcBgUFQPZyIPYHEQBBIL4OpKcDRW4A+V1AmQIgOwDIdgBiB6AAkI0s4ABkB0AxLhsgdgCxgWIgUBLWBuJDxSGCDlBDQGwQfxKQ7QBkOzAwMCQA2WlAdgKIbQfECTBDYAJAAaA4DIAkYHwHqKHJMAEHIJsMlAQbApQAyTkA+QEOQDYMgOQcgJJwA4DsRKAzHGAaEoAiDlABB6AETABEJwPZaVANSUA2FoAkbY+SGEE0EwOU2IFrYGBgiIQKAPHSEReAQwAAzhFHkV8VcvgAAAAASUVORK5CYII=`,
  48: `iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABtklEQVR42u2YPU7DQBCFJ6EhoKGgoKCgoKSkoKChoKChoKChoKChoKGgoKCgoKCgpKSgoKChoaCgoaCgIRAJ5R+xFLn4ZydhvV7Hu5NoPCun2BdlZr6dt7uzjhNhhBFBRJAPBBAR+BMQVASAfwYQcQRIAGECIIoAiR8AogeQeAMg2gCJFwCiD5AEASK+AIgeQOIPgMgBJEEAiC5A4heA6AEk/gCIHEASBIDoBCR+AYgeQOIPgMgBJEEAiC5A4heA6AEk/gCIHEASBIDoBCR+AYgeQOIPgMgBJEEAiC5A4heA6AEk/gCIHEASBIDoBiR+AIgeQOIHgOgBJP4AiBxAEgSA6AIkfgGIHkDiD4DIASRBAIguQOIXgOgBJP4AiBxAEgSA6AIkfgGIHkDiD4DIASRBAIguQOIXgOgBJP4AiBxAEgSA6AIkfgGIHkDiD4DIASRBAIguQOIXgOgBJP4AiBxAEgSA6AIkfgGIHkDiD4DIASRBAIguQOIXgOgBJP4AiBxAEgSA6AIkfgGIHkDiBwDRA0j8ARApgCQYAKIPkHgCIOoBSTAAojOAyB0g0QpIHAMRJOL4B2PQ6LbGvgbjAAAAAElFTkSuQmCC`,
  128: `iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAADqUlEQVR42u3dW27bMBCFYS9AS5BV+F10D+0eupEuoXto99JdpC9FkSIFJMuJZHHIofj/wANiO7bEr0NqSMoMAAAAAAAAAAAAAAAAgGj+MHbevgaAtr17Y+dTBwBo2wd3/PxXBQBoW/fm8f1XBQD0rHPPYqceANCzpz2+faQHQM8+6eGNlxwA0LMve3hj5nQBgJ59rYc3fpwXANCzb/fwxs8LAOjZ93t444cFAPTs+z28cXMAAD3r3eMenzUJAOjZT3p44wYBAD3raQ9v7Bz0AICefbSHN57eHgBwnXX3xx6ecawIAOhZf+7hiRsFAPSsf9/DE58sAKBn/XWPLzzDAQA96689PPf4rCIA0LNe9vCM4/OKAEDPeuvhGTdaFQDQsz708IyJ4wUAejavenhGxxEBgJ7N/70eniGOJQCgZ7OOPP/p5+OTAICezTvx/Cef9/gkAKBnM4/88fGLBQA9m/fL8x8fbyYA0LN5B56/ePzF4jYBgJ7N/OX5jy/OAwD0bOaR5z+++Gw+AKBnM4/88fEZ8wAAPZt55PmPz8ybBwDo2bxffn34fN5CAEDPZh547kKC8wD0bOaRFy4keD4/ENpX8u/FXcXJ2BfbUQkAdM9sXXfJPh7+6Z/qXsVH2xQA9M5sTXfRPh7+cY3uvkJ3NHWfrZt1AOid+aTuot0/p9MfOZf/0Ql6utDd7Rz0zuzOvg7u4iGd/lj8o4P0deEf7FEHgN6ZbdNf1F3cpcMfW0cA3a7iI20KALpntq67rLu4S6c/dqyNbtf/4Q51AOid2Zbusn0c/dM/+aPW0e6ufVXobnYM9M7stO6S7uIh3e7Y0d5Z+8r+vxN0Gy8B6J3Zbfr+su6yfTzksePac+6roHtsJwDonemO3SW7uE+HP3Yc4511b4NuoTMA6J3ZJt0l3cV9OvfYcc25d+B9drRzo6MHQO/MbtRdsoubdOpjxzrnviN6px0dHQB6Z7pbd0l30S6e8thx7rl3Yq9zc0cHgN6Zbusv2sVdOuvYMc+5bxT2OTd3egTonem+3UXdpUM6/NGRZ91nhn0O9FKnGx49ALo3u0d3cZcOdeSZ991Bm5wbHT0Aume3dZdO6XBHR591ny20WelGRw+A7pntQndxn4469MxX0C7nho4OAL0z27G7tE9HHXrWK2O7w42OHgC9M7uzv7hPRx161itjuyc3OHoA9M5sH7pLh3TooWe9cjY4enT0Heme6fbdJfu4S+c89Mxt+W3ukZpk7QMh4xT/AWeJT/s8+VGSAAAAAElFTkSuQmCC`
};

const iconsDir = path.join(process.cwd(), 'dist', 'icons');
const srcIconsDir = path.join(process.cwd(), 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(srcIconsDir)) {
  fs.mkdirSync(srcIconsDir, { recursive: true });
}

Object.entries(icons).forEach(([size, base64]) => {
  const buffer = Buffer.from(base64, 'base64');
  const filename = `icon${size}.png`;

  // Save to both locations
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  fs.writeFileSync(path.join(srcIconsDir, filename), buffer);

  console.log(`Created ${filename}`);
});

console.log('\nPNG icons created successfully!');
