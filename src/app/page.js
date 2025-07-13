
'use client';
import { Card, CardContent, CardMedia, Typography, Button, Grid } from '@mui/material';
import Link from 'next/link';
import Image from "next/image";

export default function Home() {
 const dummyItems = [
    {
      id: 1,
      name: "Chicken Biryani",
      image: "https://via.placeholder.com/400x250?text=Chicken+Biryani",
      description: "Spicy basmati rice with tender chicken pieces.",
      price: 750,
      sellerId: "s001"
    },
    {
      id: 2,
      name: "Veg Kottu",
      image: "https://via.placeholder.com/400x250?text=Veg+Kottu",
      description: "Delicious Sri Lankan chopped roti with vegetables.",
      price: 600,
      sellerId: "s002"
    },
    {
      id: 3,
      name: "Pasta Carbonara",
      image: "https://via.placeholder.com/400x250?text=Pasta+Carbonara",
      description: "Creamy pasta with bacon, egg, and cheese.",
      price: 850,
      sellerId: "s003"
    },
    {
      id: 4,
      name: "Fried Rice",
      image: "https://via.placeholder.com/400x250?text=Fried+Rice",
      description: "Egg fried rice served with chili paste.",
      price: 700,
      sellerId: "s004"
    },
    {
      id: 5,
      name: "Burger Combo",
      image: "https://via.placeholder.com/400x250?text=Burger+Combo",
      description: "Beef burger with fries and soft drink.",
      price: 950,
      sellerId: "s005"
    },
  ];

  return (
    <main className="p-6">
      <Typography variant="h4" gutterBottom>
        Welcome to MealMatrix
      </Typography>
      <Grid container spacing={4}>
        {dummyItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card className="shadow-lg">
              <CardMedia component="img" height="180" image={item.image} alt={item.name} />
              <CardContent>
                <Typography variant="h6">{item.name}</Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {item.description}
                </Typography>
                <Typography variant="subtitle1" color="primary">
                  Rs. {item.price}
                </Typography>
                <Link href={`/products/${item.id}`} passHref>
                  <Button
                    variant="contained"
                    sx={{ mt: 1, backgroundColor: '#FF4081', textTransform: 'none' }}
                  >
                    Show More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </main>
  );
}
