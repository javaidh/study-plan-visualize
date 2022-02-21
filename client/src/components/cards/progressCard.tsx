import * as React from "react";
import { Avatar, Box, Card, CardContent, Grid, LinearProgress, Typography } from '@mui/material';
import InsertChartIcon from '@mui/icons-material/InsertChartOutlined';

type ProgressCardProps = {
    percentComplete: number;
    title: string;
    icon?: string;
}

export const ProgressCard:React.FC<ProgressCardProps> = props => {
    const { percentComplete, title, icon } = props;
    return (
        <Card
            sx={{ height: '100%' }}
        >
            <CardContent>
                <Grid
                    container
                    spacing={3}
                    sx={{ justifyContent: 'space-between' }}
                >
                    <Grid item>
                        <Typography
                            color="textSecondary"
                            gutterBottom
                            variant="overline"
                        >
                            {title}
                        </Typography>
                        <Typography
                            color="textPrimary"
                            variant="h4"
                        >
                            {percentComplete}%
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Avatar
                            sx={{
                                backgroundColor: 'warning.main',
                                height: 56,
                                width: 56
                            }}
                        >
                            <InsertChartIcon />
                        </Avatar>
                    </Grid>
                </Grid>
                <Box sx={{ pt: 3 }}>
                    <LinearProgress
                        value={percentComplete}
                        variant="determinate"
                    />
                </Box>
            </CardContent>
        </Card>
    );
}