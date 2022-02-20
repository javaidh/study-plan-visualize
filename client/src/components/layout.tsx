import * as React from "react";
import {Box, Container, Grid} from "@mui/material";
import { BasicBox } from "./BasicBox";

export const Layout:React.FC = () => (
    <Box
        component="main"
        sx={{
            flexGrow: 1,
            py: 8
        }}
    >
        <Container maxWidth={false}>
            <Grid
                container
                spacing={3}
            >
                <Grid
                    item
                    lg={3}
                    sm={6}
                    xl={3}
                    xs={12}
                >
                    <BasicBox />
                </Grid>
                <Grid
                    item
                    xl={3}
                    lg={3}
                    sm={6}
                    xs={12}
                >
                    Test
                </Grid>
                <Grid
                    item
                    xl={3}
                    lg={3}
                    sm={6}
                    xs={12}
                >
                    Test
                </Grid>
                <Grid
                    item
                    xl={3}
                    lg={3}
                    sm={6}
                    xs={12}
                >
                    Test
                </Grid>
                <Grid
                    item
                    lg={8}
                    md={12}
                    xl={9}
                    xs={12}
                >
                    Test
                </Grid>
                <Grid
                    item
                    lg={4}
                    md={6}
                    xl={3}
                    xs={12}
                >
                    Test
                </Grid>
                <Grid
                    item
                    lg={4}
                    md={6}
                    xl={3}
                    xs={12}
                >
                    Test
                </Grid>
                <Grid
                    item
                    lg={8}
                    md={12}
                    xl={9}
                    xs={12}
                >
                    Test
                </Grid>
            </Grid>
        </Container>
    </Box>
)