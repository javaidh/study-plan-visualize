import * as React from "react";
import { formatDistanceToNow } from 'date-fns';
import {
    Box,
    Button,
    Card,
    CardHeader,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText
} from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';

type Item = {
    id?: string;
    name?: string;
    imageUrl?: string;
    updatedAt?: number | Date;
}

type ItemListProps = {
    items?: Item[];
    title?: string;
    itemType?: string;
}

export const ItemList: React.FC<ItemListProps> = props => {
    // Props
    const { items, title, itemType } = props;
    // Derived From props
    const displayTitle = title || "Unknown Items";
    // Render
    return (
        <Card {...props}>
            <CardHeader
                subtitle={`${items?.length} in total`}
                title={displayTitle}
            />
            <Divider />
            {items && <List>
                {items.map((item, i) => (
                    <ListItem
                        divider={i < items?.length - 1}
                        key={item.id}
                    >
                        <ListItemAvatar>
                            {/*<img*/}
                            {/*    alt={item.name}*/}
                            {/*    src={item.imageUrl}*/}
                            {/*    style={{*/}
                            {/*        height: 48,*/}
                            {/*        width: 48*/}
                            {/*    }}*/}
                            {/*/>*/}
                        </ListItemAvatar>
                        <ListItemText
                            primary={item.name}
                            secondary={`Updated ${formatDistanceToNow(item?.updatedAt || 0)}`}
                        />
                        <IconButton
                            edge="end"
                            size="small"
                        >
                            <MoreVertIcon />
                        </IconButton>
                    </ListItem>
                ))}
            </List>}
            <Divider />
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    p: 2
                }}
            >
                <Button
                    color="primary"
                    endIcon={<ArrowRightIcon />}
                    size="small"
                    variant="text"
                >
                    Add {itemType}
                </Button>
            </Box>
        </Card>
    );
}