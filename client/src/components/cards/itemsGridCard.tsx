import * as React from "react";

import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
    Box,
    Button,
    Card,
    CardHeader,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    LinearProgress
} from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { SeverityPill } from '../severitypill';

const orders = [
    {
        id: uuid(),
        ref: 'CDD1049',
        amount: 30.5,
        customer: {
            name: 'Javascript Fundamentals'
        },
        createdAt: 1555016400000,
        learnedBy: ["Skill 1, Skill2, Skill 3"],
        status: 'pending'
    },
    {
        id: uuid(),
        ref: 'CDD1048',
        amount: 25.1,
        customer: {
            name: 'Java for Dummies'
        },
        createdAt: 1555016400000,
        learnedBy: ["Skill 1, Skill2, Skill 3"],
        status: 'delivered'
    },
    {
        id: uuid(),
        ref: 'CDD1047',
        amount: 10.99,
        customer: {
            name: 'Multiplatform'
        },
        createdAt: 1554930000000,
        learnedBy: ["Book One, Book Two, Course 3"],
        status: 'refunded'
    },
    {
        id: uuid(),
        ref: 'CDD1046',
        amount: 96.43,
        customer: {
            name: 'Dynamic Programming'
        },
        createdAt: 1554757200000,
        learnedBy: ["Book One, Book Two, Course 3"],
        status: 'pending'
    },
    {
        id: uuid(),
        ref: 'CDD1045',
        amount: 32.54,
        customer: {
            name: 'Clarke Gillebert'
        },
        createdAt: 1554670800000,
        learnedBy: ["Book One, Book Two, Course 3"],
        status: 'delivered'
    },
    {
        id: uuid(),
        ref: 'CDD1044',
        amount: 16.76,
        customer: {
            name: 'Adam Denisov'
        },
        createdAt: 1554670800000,
        learnedBy: ["Book One, Book Two, Course 3"],
        status: 'delivered'
    }
];

export const ItemsGridCard = () => (
    <Card>
        <CardHeader title="Books List" />
            <Box sx={{ minWidth: 800, overflow: "auto" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                Book Name
                            </TableCell>
                            <TableCell>
                                Teaches
                            </TableCell>
                            <TableCell>
                                Progress
                            </TableCell>
                            <TableCell>
                                Status
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow
                                hover
                                key={order.id}
                            >
                                <TableCell>
                                    {order.customer.name}
                                </TableCell>
                                <TableCell>
                                    {`${order.learnedBy}`}
                                </TableCell>
                                <TableCell>
                                    <LinearProgress
                                        value={order.amount}
                                        variant="determinate"
                                    />
                                </TableCell>
                                <TableCell>
                                    <SeverityPill
                                        color={(order.status === 'delivered' && 'success')
                                        || (order.status === 'refunded' && 'error')
                                        || 'warning'}
                                    >
                                        {order.status}
                                    </SeverityPill>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                p: 2
            }}
        >
            <Button
                color="primary"
                endIcon={<ArrowRightIcon fontSize="small" />}
                size="small"
                variant="text"
            >
                Add Skill
            </Button>
        </Box>
    </Card>
);