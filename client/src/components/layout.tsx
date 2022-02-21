import * as React from "react";
// Material UI Imports
import {Box, Container, Grid} from "@mui/material";
// Component Imports
import { ProgressCard } from "./progressCard";
import { ItemList } from "./itemListCard";
// Util Imports
import { products } from "../utils";

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
                    lg={12}
                    md={12}
                    xl={12}
                    xs={12}
                >
                    <ProgressCard title={"Overall Progress"} percentComplete={96} />
                </Grid>
                <Grid
                    item
                    lg={6}
                    sm={6}
                    xl={6}
                    xs={12}
                >
                    <ProgressCard title={"Skills Progress"} percentComplete={24.5} />
                </Grid>
                <Grid
                    item
                    xl={6}
                    lg={6}
                    sm={6}
                    xs={12}
                >
                    <ProgressCard title={"Languages Progress"} percentComplete={96} />
                </Grid>
                <Grid
                    item
                    xl={6}
                    lg={6}
                    sm={6}
                    xs={12}
                >
                    <ItemList items={products} title={"Books List"} itemType={"Book"}  />
                </Grid>
                <Grid
                    item
                    xl={6}
                    lg={6}
                    sm={6}
                    xs={12}
                >
                    <ItemList items={products} title={"Courses List"} itemType={"Course"}  />
                </Grid>
                <Grid
                    item
                    xl={6}
                    lg={6}
                    sm={6}
                    xs={12}
                >
                    <ProgressCard title={"Books Progress"} percentComplete={96} />
                </Grid>
                <Grid
                    item
                    xl={6}
                    lg={6}
                    sm={6}
                    xs={12}
                >
                    <ProgressCard title={"Courses Progress"} percentComplete={96} />
                </Grid>
            </Grid>
        </Container>
    </Box>
)