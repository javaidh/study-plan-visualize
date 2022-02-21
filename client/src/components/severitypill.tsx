import * as React from "react";
import { styled } from '@mui/material/styles';

const SeverityPillRoot = (theme: any, ownerState: any) => {
    const backgroundColor = theme.palette[ownerState.color].main;
    const color = theme.palette[ownerState.color].contrastText;

    return {
        alignItems: 'center',
        backgroundColor,
        borderRadius: 12,
        color,
        cursor: 'default',
        display: 'inline-flex',
        flexGrow: 0,
        flexShrink: 0,
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.pxToRem(12),
        lineHeight: 2,
        fontWeight: 600,
        justifyContent: 'center',
        letterSpacing: 0.5,
        minWidth: 20,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
    };
};

export type SeverityPillProps = {
    color: 'primary' |
        'secondary' |
        'error' |
        'info' |
        'warning' |
        'success';
};

export const SeverityPill:React.FC<SeverityPillProps> = (props) => {
    const { color = 'primary', children } = props;

    const ownerState = { color };

    return (
        <span
        >
            {children}
        </span>
    );
};