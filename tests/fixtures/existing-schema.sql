-- Schema verified against Supabase project juridico, 2026-11-12. No customer data.
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE TABLE users(id serial PRIMARY KEY,name varchar(150) NOT NULL,email varchar(150) UNIQUE NOT NULL,phone varchar(20) NOT NULL,password text NOT NULL,type text DEFAULT '');
CREATE TABLE lawyers(id serial PRIMARY KEY,id_user integer NOT NULL UNIQUE REFERENCES users(id),oab varchar(30) UNIQUE NOT NULL,position varchar(100) NOT NULL,whatsapp varchar(20) NOT NULL,photo text);
CREATE TABLE costumers(id serial PRIMARY KEY,id_user integer UNIQUE NOT NULL REFERENCES users(id),cpf varchar(14) UNIQUE NOT NULL,date date NOT NULL,address varchar(255) NOT NULL);
CREATE TABLE process(id serial PRIMARY KEY,process_num varchar(50) UNIQUE NOT NULL,title varchar(150) NOT NULL,id_costumer integer NOT NULL REFERENCES costumers(id),id_lawyer integer NOT NULL REFERENCES lawyers(id),status varchar(50) NOT NULL,area varchar(100) NOT NULL,last_update timestamp NOT NULL DEFAULT now(),court varchar(150) NOT NULL,observations text);
CREATE TABLE documents(id serial PRIMARY KEY,id_process integer NOT NULL REFERENCES process(id),name varchar(100) NOT NULL,file_path text NOT NULL,status varchar(100) NOT NULL,date_sed timestamp NOT NULL,date_ass timestamp NOT NULL);
CREATE TABLE hearings(id serial PRIMARY KEY,id_process integer NOT NULL REFERENCES process(id),type varchar(100) NOT NULL,date date,hour time,place varchar(100) NOT NULL,room varchar(100) NOT NULL,meeting_link varchar(255) NOT NULL,guidelines text NOT NULL);
CREATE TABLE movements(id serial PRIMARY KEY,id_process integer NOT NULL REFERENCES process(id),date date DEFAULT CURRENT_DATE,title varchar(150) NOT NULL,description text NOT NULL);
CREATE TABLE notifications(id serial PRIMARY KEY,id_user integer NOT NULL REFERENCES users(id),title varchar(150) NOT NULL,description text NOT NULL,date timestamp NOT NULL DEFAULT now(),read boolean NOT NULL DEFAULT false);
