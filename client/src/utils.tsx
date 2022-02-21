import {v4 as uuid} from "uuid";
import {subHours} from "date-fns";


export const products = [
    {
        id: uuid(),
        name: 'Dropbox',
        imageUrl: '/static/images/products/product_1.png',
        updatedAt: subHours(Date.now(), 2)
    },
    {
        id: uuid(),
        name: 'Medium Corporation',
        imageUrl: '/static/images/products/product_2.png',
        updatedAt: subHours(Date.now(), 2)
    },
    {
        id: uuid(),
        name: 'Slack',
        imageUrl: '/static/images/products/product_3.png',
        updatedAt: subHours(Date.now(), 3)
    },
    {
        id: uuid(),
        name: 'Lyft',
        imageUrl: '/static/images/products/product_4.png',
        updatedAt: subHours(Date.now(), 5)
    },
    {
        id: uuid(),
        name: 'GitHub',
        imageUrl: '/static/images/products/product_5.png',
        updatedAt: subHours(Date.now(), 9)
    }
];